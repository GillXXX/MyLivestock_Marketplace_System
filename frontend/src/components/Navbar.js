import { Link } from 'react-router-dom';

function Navbar() {

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success">

      <div className="container">

        <Link className="navbar-brand" to="/">
          Livestock Marketplace
        </Link>

        <div>

          <Link className="btn btn-light me-2" to="/login">
            Login
          </Link>

          <Link className="btn btn-warning" to="/register">
            Register
          </Link>

        </div>

      </div>

    </nav>
  );
}

export default Navbar;