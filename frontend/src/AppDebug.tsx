import { useEffect, useState } from 'react'

function AppDebug() {
  const [status, setStatus] = useState('Loading...')
  const [bookmarks, setBookmarks] = useState<any>(null)
  const [groups, setGroups] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setStatus('Fetching bookmarks...')
        const bookmarksRes = await fetch('http://localhost:8889/api/bookmarks')
        const bookmarksData = await bookmarksRes.json()
        setBookmarks(bookmarksData)
        
        setStatus('Fetching groups...')
        const groupsRes = await fetch('http://localhost:8889/api/groups')
        const groupsData = await groupsRes.json()
        setGroups(groupsData)
        
        setStatus('Data loaded successfully!')
      } catch (err: any) {
        setError(err.message)
        setStatus('Error loading data')
      }
    }
    
    fetchData()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Hubble Debug Page</h1>
      <h2>Status: {status}</h2>
      
      {error && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>
          Error: {error}
        </div>
      )}
      
      <div>
        <h3>Bookmarks Response:</h3>
        <pre>{JSON.stringify(bookmarks, null, 2)}</pre>
      </div>
      
      <div>
        <h3>Groups Response:</h3>
        <pre>{JSON.stringify(groups, null, 2)}</pre>
      </div>
    </div>
  )
}

export default AppDebug