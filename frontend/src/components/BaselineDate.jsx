export default function BaselineDate({ value }) {
  return (
    <p className="w-full text-sm text-slate-400 sm:w-auto">
      Нулевая дата отсчёта: <span className="font-medium text-slate-100">{value}</span>
    </p>
  )
}
