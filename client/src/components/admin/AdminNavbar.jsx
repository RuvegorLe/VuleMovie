import { Link } from "react-router-dom";
import { assets } from "../../assets/assets";

const AdminNavbar = () => {
  return (
    <div className="flex items-center justify-between px-6 md:px-10 h-16 border-b border-gray-300/30">
      <Link to="/">
        <h1 className="text-3xl font-bold text-primary">QVu_Movie</h1>
      </Link>
    </div>
  );
};

export default AdminNavbar;
