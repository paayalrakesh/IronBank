import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";

const router = Router();

const transferSchema = z.object({
  fromAccountId: z.string().length(24),
  toAccountNumber: z.string().regex(/^\d{10}$/),
  amount: z.string(), // e.g. "250.75"
  memo: z.string().max(120).optional(),
});

function toCents(amountStr) {
  const clean = String(amountStr).replace(/[, ]+/g, "");
  const n = Number(clean);
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}
function fmtCents(c) { return (c / 100).toFixed(2); }

router.get("/accounts", async (req, res) => {
  const accounts = await Account.find({ user: req.userId }).sort({ createdAt: 1 }).lean();
  return res.json(accounts.map(a => ({
    id: a._id, number: a.number, type: a.type, currency: a.currency,
    balanceCents: a.balanceCents, balance: fmtCents(a.balanceCents)
  })));
});

router.get("/transactions", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 25), 100);
  const tx = await Transaction.find({ user: req.userId })
    .populate("account", "number type")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return res.json(tx.map(t => ({
    id: t._id,
    account: { id: t.account?._id, number: t.account?.number, type: t.account?.type },
    direction: t.direction,
    amountCents: t.amountCents,
    amount: fmtCents(t.amountCents),
    balanceAfterCents: t.balanceAfterCents,
    balanceAfter: fmtCents(t.balanceAfterCents),
    memo: t.memo,
    counterpartyNumber: t.counterpartyNumber,
    createdAt: t.createdAt
  })));
});

router.post("/transfer", async (req, res) => {
  try {
    const input = transferSchema.parse(req.body);
    const amountCents = toCents(input.amount);
    if (!amountCents) return res.status(400).json({ message: "Invalid amount" });

    const from = await Account.findOne({ _id: input.fromAccountId, user: req.userId }).exec();
    if (!from) return res.status(404).json({ message: "From account not found" });

    const to = await Account.findOne({ number: input.toAccountNumber }).exec();
    if (!to) return res.status(404).json({ message: "Destination account not found" });

    if (from.balanceCents < amountCents) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // update balances
      from.balanceCents -= amountCents;
      to.balanceCents += amountCents;
      await from.save({ session });
      await to.save({ session });

      // transactions (outgoing)
      const txOut = await Transaction.create([{
        user: from.user,
        account: from._id,
        direction: "out",
        amountCents,
        balanceAfterCents: from.balanceCents,
        memo: input.memo || `Transfer to ${to.number}`,
        counterpartyNumber: to.number
      }], { session });

      // incoming
      const txIn = await Transaction.create([{
        user: to.user,
        account: to._id,
        direction: "in",
        amountCents,
        balanceAfterCents: to.balanceCents,
        memo: input.memo || `Transfer from ${from.number}`,
        counterpartyNumber: from.number
      }], { session });

      await session.commitTransaction();
      session.endSession();

      return res.json({
        message: "Transfer complete",
        from: { id: from._id, balance: fmtCents(from.balanceCents) },
        to: { id: to._id, balance: fmtCents(to.balanceCents) },
        txOutId: txOut[0]._id,
        txInId: txIn[0]._id
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
