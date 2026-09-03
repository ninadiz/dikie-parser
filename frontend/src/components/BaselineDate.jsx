export default function BaselineDate({ value }) {
  return (
    <p className="w-full text-sm text-slate-600 sm:w-auto">
      Нулевая дата отсчёта: <span className="font-medium text-slate-800">{value}</span>
    </p>
  )
}
