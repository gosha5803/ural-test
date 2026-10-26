import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { STATUS, selectOffers, selectOffersGoods, selectOfferAnalogues } from '../store/partsSlice'
import LoaderBar, { Spinner } from './Loader'
import ErrorAlert from './ErrorAlert'
import './OffersTable.css'

// Показываемое предложение — самый дешёвый склад с остатком (при равной цене — возвратное).
// Верхнеуровневый price API просит не использовать
const bestOffer = (warehouses = []) =>
  warehouses
    .filter((w) => w.stock > 0)
    .reduce(
      (best, w) =>
        !best || w.price < best.price || (w.price === best.price && best.notRefund && !w.notRefund)
          ? w
          : best,
      null,
    )

// TODO: вынести один Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }) на уровень модуля,
// чтобы не собирать форматтер заново на каждую ячейку
const formatPrice = (price) =>
  `${price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`

// Колонки, по которым можно сортировать: ключ → значение строки
const SORT_GETTERS = {
  price: (item) => bestOffer(item.warehouses)?.price ?? null,
  count: (item) => item.count,
}

const NO_SORT = { key: null, dir: null }

// Клик по колонке: по возрастанию → по убыванию → без сортировки (порядок API)
const nextSort = (sort, key) => {
  if (sort.key !== key) return { key, dir: 'asc' }
  return sort.dir === 'asc' ? { key, dir: 'desc' } : NO_SORT
}

// Копия, порядок в сторе не трогаем; sort стабильный — при равных значениях остаётся порядок API.
// null (нет цены) всегда в конце, независимо от направления
const sortRows = (rows, { key, dir }) => {
  if (!key) return rows
  const getValue = SORT_GETTERS[key]
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = getValue(a)
    const vb = getValue(b)
    if (va === vb) return 0
    if (va === null) return 1
    if (vb === null) return -1
    return (va - vb) * sign
  })
}

const SORT_ICONS = { asc: '▲', desc: '▼' }
const ARIA_SORT = { asc: 'ascending', desc: 'descending' }

function SortableTh({ sortKey, sort, onSort, children }) {
  const dir = sort.key === sortKey ? sort.dir : null

  return (
    <th className="text-end" aria-sort={ARIA_SORT[dir] ?? 'none'}>
      <button
        type="button"
        className="btn btn-link p-0 fw-semibold text-reset text-decoration-none text-nowrap"
        onClick={() => onSort(sortKey)}
      >
        {children} <span className={dir ? 'text-primary' : 'opacity-25'}>{SORT_ICONS[dir] ?? '⇅'}</span>
      </button>
    </th>
  )
}

function OfferRow({ item, isOriginal }) {
  const offer = bestOffer(item.warehouses)
  // Невозвратным бывает сам товар или конкретное предложение склада — важно то, чью цену показываем
  const notRefund = item.notRefund || offer?.notRefund

  return (
    <tr className={isOriginal ? 'table-primary' : undefined}>
      <td>
        <div className="fw-semibold">
          {item.name || '—'}
          {isOriginal && <span className="badge text-bg-primary ms-2">Искомый артикул</span>}
          {notRefund && (
            <span className="badge text-bg-warning ms-2" title="Нельзя вернуть по причине «Отказ»">
              Невозвратный
            </span>
          )}
        </div>
        <small className="text-secondary">
          {item.brand} · {item.number}
        </small>
      </td>
      {/* Цена — минимальная по складам, остаток — суммарный, поэтому «от» */}
      <td className="text-end text-nowrap">{offer ? `от ${formatPrice(offer.price)}` : '—'}</td>
      <td className="text-end">{item.count}</td>
    </tr>
  )
}

export default function OffersTable() {
  const { status, error } = useSelector(selectOffers)
  const originals = useSelector(selectOffersGoods)
  const analogues = useSelector(selectOfferAnalogues)
  const [sort, setSort] = useState(NO_SORT)
  const scrollRef = useRef(null)

  // Исходные позиции закреплены сверху, сортируются только аналоги
  const sortedAnalogues = useMemo(() => sortRows(analogues, sort), [analogues, sort])

  // Новые данные или другая сортировка — показываем с начала, а не с позиции прокрутки
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [originals, sortedAnalogues])

  if (status === STATUS.idle) return null

  const loading = status === STATUS.loading
  const totalLength = originals.length + analogues.length
  // Первая загрузка — спиннер; повторная — старая таблица приглушена, сверху полоска
  if (loading && !totalLength) return <Spinner text="Загружаем предложения…" />

  const handleSort = (key) => setSort((prev) => nextSort(prev, key))

  return (
    // Забирает остаток высоты App; min-height: 0 — чтобы flex-элемент мог быть ниже своего содержимого
    <div className="position-relative pt-1 flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
      {loading && <LoaderBar />}
      {status === STATUS.failed && <ErrorAlert message={error} />}
      {status === STATUS.succeeded && !totalLength && (
        <div className="alert alert-info mb-0">Ничего не найдено</div>
      )}
      {totalLength > 0 && (
        <>
          {/* Прокручивается только таблица; полоска загрузки и счётчик остаются на месте */}
          <div ref={scrollRef} className="flex-grow-1 overflow-auto rounded border shadow-sm">
            <table className={`offers-table table table-hover align-middle mb-0 ${loading ? 'opacity-50' : ''}`}>
              <thead className="sticky-top table-light">
                <tr>
                  <th>Название / Производитель</th>
                  <SortableTh sortKey="price" sort={sort} onSort={handleSort}>
                    Цена
                  </SortableTh>
                  <SortableTh sortKey="count" sort={sort} onSort={handleSort}>
                    Остаток
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {originals.map((item) => (
                  <OfferRow key={item.goodsID} item={item} isOriginal />
                ))}
                {sortedAnalogues.map((item) => (
                  <OfferRow key={item.goodsID} item={item} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-secondary text-end pt-2 flex-shrink-0">Количество позиций: {totalLength}</div>
        </>
      )}
    </div>
  )
}
