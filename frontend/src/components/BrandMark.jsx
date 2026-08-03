/* eslint-disable react/prop-types */
export default function BrandMark({ className = '' }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <img className="brand-mark-light" src="./gamefold-logo-black.png" alt="" />
      <img className="brand-mark-dark" src="./gamefold-logo-white.png" alt="" />
    </span>
  )
}
