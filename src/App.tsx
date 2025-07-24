import '../style/dash.css'

function App() {
  return (
    <>
  <div className="navi">
    <nav id="nev">
      <ul className="items">
        <li>
          <a id="hide-to" href="index.html">
            Home
          </a>
        </li>
        <li>
          <a id="hide-to" href="dashboard.html">
            Dashboard
          </a>
        </li>
        <li>
          <a id="hide-to" href="post.html">
            Create Note
          </a>
        </li>
        <li>
          <a id="hide-to" href="about.html">
            About
          </a>
        </li>
        <i id="ham" className="bi bi-list" />
      </ul>
    </nav>
  </div>
  
  <section className="dashboard">
    <div className="follower-notes" />
    <div className="others-notes" />
  </section>
</>
  )
}

export default App
