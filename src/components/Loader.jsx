import './Loader.css'

// Полоска загрузки, прижатая к верхней границе ближайшего position: relative родителя
export default function LoaderBar() {
  return (
    <div className="loader-bar" role="progressbar" aria-label="Загрузка">
      <div className="loader-bar__runner" />
    </div>
  )
}

// Спиннер; с text — отдельный блок по центру для первой загрузки
export function Spinner({ text }) {
  const spinner = <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
  if (!text) {
    return (
      <span role="status">
        {spinner}
        <span className="visually-hidden">Загрузка…</span>
      </span>
    )
  }

  return (
    <div className="d-flex justify-content-center align-items-center gap-2 py-2 text-secondary" role="status">
      {spinner}
      <span>{text}</span>
    </div>
  )
}
