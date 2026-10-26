import { useDispatch, useSelector } from 'react-redux'
import {
  STATUS,
  fetchOffers,
  selectSearch,
  selectBrands,
  selectSelectedBrand,
} from '../store/partsSlice'
import { Spinner } from './Loader'
import ErrorAlert from './ErrorAlert'

const Hint = ({ children }) => <div className="alert alert-light text-center mb-0">{children}</div>

export default function BrandList() {
  const dispatch = useDispatch()
  const { status, error } = useSelector(selectSearch)
  const brands = useSelector(selectBrands)
  const selectedBrand = useSelector(selectSelectedBrand)

  switch (status) {
    case STATUS.idle:
      return <Hint>Введите артикул товара, чтобы получить список производителей</Hint>
    case STATUS.failed:
      return <ErrorAlert message={error} />
    case STATUS.loading:
      // Первый поиск — спиннер с текстом; повторный — старые бренды приглушены, рядом спиннер
      if (!brands.length) return <Spinner text="Ищем производителей…" />
      break
    case STATUS.succeeded:
      if (!brands.length) return <div className="alert alert-info mb-0">Ничего не найдено</div>
      break
  }

  const loading = status === STATUS.loading

  return (
    <div className="d-flex flex-wrap justify-content-center align-items-center gap-2">
      <span className="text-secondary">Производители:</span>
      {brands.map((brand) => (
        <button
          key={brand}
          type="button"
          className={`btn ${brand === selectedBrand ? 'btn-primary' : 'btn-outline-primary'}`}
          // Во время нового поиска в сторе уже новый артикул — старые бренды кликать нельзя
          // (disabled заодно приглушает кнопки)
          disabled={loading}
          onClick={() => dispatch(fetchOffers(brand))}
        >
          {brand}
        </button>
      ))}
      {loading && <Spinner />}
    </div>
  )
}
