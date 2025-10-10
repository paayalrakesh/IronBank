export default function SplineBG() {
  return (
    <div className="spline-bg" aria-hidden="true">
      {/* shift left a bit to push the Spline watermark off-screen */}
      <div className="spline-shift">
        <spline-viewer url="https://prod.spline.design/iaJXP2qHocJrcscl/scene.splinecode"></spline-viewer>
      </div>
    </div>
  );
}
