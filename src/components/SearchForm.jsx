import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { searchBrands, selectIsSearching } from '../store/partsSlice'

export default function SearchForm() {
  const dispatch = useDispatch()
  const loading = useSelector(selectIsSearching)
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const number = value.trim()
    if (number) dispatch(searchBrands(number))
  }

  return (
    <form className="d-flex gap-2" onSubmit={handleSubmit}>
      <input
        className="form-control"
        aria-label="Артикул"
        placeholder="Артикул, например 7160500039S"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <button className="btn btn-primary" type="submit" disabled={loading || !value.trim()}>
        Найти
      </button>
    </form>
  )
}
