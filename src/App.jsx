import SearchForm from './components/SearchForm'
import BrandList from './components/BrandList'
import OffersTable from './components/OffersTable'

// Приложение на всю высоту окна: шапка (поиск + бренды) по содержимому, остаток — таблице с внутренним скроллом
export default function App() {
  return (
    <div className="container py-4 vh-100 d-flex flex-column">
      <h1 className="h4 text-center mb-4 flex-shrink-0">Поиск запчастей и аналогов</h1>

      <div className="row justify-content-center mb-3 flex-shrink-0">
        <div className="col-md-6">
          <SearchForm />
        </div>
      </div>

      <div className="mb-4 flex-shrink-0">
        <BrandList />
      </div>

      <OffersTable />
    </div>
  )
}
