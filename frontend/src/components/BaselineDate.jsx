export default function BaselineDate({ value }) {
  return (
    <p className="w-full text-sm text-slate-400 light:text-slate-600 sm:w-auto">
      Нулевая дата отсчёта:{' '}
      <span className="font-medium text-slate-100 light:text-slate-900">{value}</span>
    </p>
  )
}
