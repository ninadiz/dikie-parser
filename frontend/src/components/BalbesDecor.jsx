// Just a joke decoration someone dropped in the project — safe to delete this file
// and its one import in App.jsx any time, nothing else depends on it.
export default function BalbesDecor() {
  return (
    <img
      src="/balbes.jpg"
      alt=""
      aria-hidden="true"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
      className="pointer-events-none fixed right-4 top-24 z-0 hidden w-40 rounded-lg opacity-20 xl:block"
    />
  )
}
