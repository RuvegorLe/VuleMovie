import {
  ChartLineIcon,
  CircleDollarSignIcon,
  PlayCircleIcon,
  StarIcon,
  UsersIcon,
  Trash2, 
  Pencil,
} from "lucide-react";
import { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import BlurCircle from "../../components/BlurCircle";
import { dateFormat } from "../../lib/dateFormat";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const Dashboard = () => {
  const { axios, getToken, user, image_base_url } = useAppContext();

  const currency = import.meta.env.VITE_CURRENCY;

  const [dashboardData, setDashboardData] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeShows: [],
    totalUser: 0,
  });

  const [loading, setLoading] = useState(true);
  const [editingShow, setEditingShow] = useState(null); 
  const [deletingId, setDeletingId] = useState(null); 

  const dashboardCards = [
    {
      title: "Total Bookings",
      value: dashboardData.totalBookings || "0",
      icon: ChartLineIcon,
    },
    {
      title: "Total Revenue",
      value: currency + dashboardData.totalRevenue || "0",
      icon: CircleDollarSignIcon,
    },
    {
      title: "Active Shows",
      value: dashboardData.activeShows.length || "0",
      icon: PlayCircleIcon,
    },
    {
      title: "Total Users",
      value: dashboardData.totalUser || "0",
      icon: UsersIcon,
    },
  ];

  const fetchDashboardData = async () => {
    try {
      const { data } = await axios.get("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setDashboardData(data.dashboardData);
        setLoading(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Error fetching dashboard data:", error);
    }
  };

  const handleDeleteShow = async (showId) => {
    if (!window.confirm("Are you sure you want to delete this show?")) return;

    try {
      
      await axios.delete(`/api/show/${showId}`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      toast.success("Show deleted successfully!");
      fetchShows(); // làm mới danh sách show sau khi xóa
    } catch (error) {
      console.error("Delete Show Error:", error);
      toast.error("Failed to delete show!");
    }
  };


  const handleUpdateShow = async (e) => {
    e.preventDefault(); 
    if (!editingShow) return;

    const showId = editingShow._id;
    const form = e.target;
    const newPrice = form.showPrice.value;
    const newDateTime = form.showDateTime.value;

    // Chuẩn bị payload
    const updatedData = {
        showPrice: Number(newPrice), 
        showDateTime: newDateTime, 
    };    

    if (updatedData.showPrice === editingShow.showPrice && updatedData.showDateTime === new Date(editingShow.showDateTime).toISOString().slice(0, 16)) {
        setEditingShow(null);
        return toast("No changes detected.");
    }

    try {
        await axios.put(`/api/show/${showId}`, updatedData, {
            headers: { Authorization: `Bearer ${await getToken()}` },
        });
        
        toast.success("Show updated successfully!");
        setEditingShow(null); 
        fetchDashboardData(); 
    } catch (error) {
        console.error("Update Show Error:", error);
        toast.error("Failed to update show!");
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  

  return !loading ? (
    <>
      <Title text1="Admin" text2="Dashboard" />
      <div className="relative flex flex-wrap gap-4 mt-6">
        <BlurCircle top="-100px" left="0" />
        <div className="flex flex-wrap gap-4 w-full">
          {dashboardCards.map((card, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-3 bg-primary/10 border border-primary/20 rounded-md max-w-50 w-full"
            >
              <div>
                <h1 className="text-sm">{card.title}</h1>
                <p className="text-xl font-medium mt-1">{card.value}</p>
              </div>
              <card.icon className="w-6 h-6" />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-10 text-lg font-medium">Active Shows</p>
      <div className="relative flex flex-wrap gap-6 mt-4 max-w-5xl">
        <BlurCircle top="100px" left="-10%" />
        {dashboardData.activeShows
          .filter((show) => show.movie !== null)
          .map((show) => (
          <div
            key={show._id}
            className="w-55 rounded-lg overflow-hidden h-full pb-3 bg-primary/10 border border-primary/20 hover:-translate-y-1 transition duration-300"
          >
            <img
              src={image_base_url + show.movie.poster_path}
              alt="poster"
              className="h-60 w-full object-cover"
            />
            <p className="font-medium p-2 truncate">{show.movie.title}</p>
            <div className="flex items-center justify-between px-2">
              <p className="text-lg font-medium">
                {currency} {show.showPrice}
              </p>
              <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
                <StarIcon className="w-4 h-4 text-primary fill-primary" />
                {show.movie.vote_average.toFixed(1)}
              </p>
            </div>
            <p className="px-2 pt-2 text-sm text-gray-500">
              {dateFormat(show.showDateTime)}
            </p>
            {/* // Action Buttons */}
            <div className="flex justify-end p-2 gap-2 mt-2">
                  <button 
                      onClick={() => setEditingShow(show)} 
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit Show"
                  >
                      <Pencil className="w-4 h-4" />
                  </button>
                  <button
                      onClick={() => handleDeleteShow(show._id)}
                      disabled={deletingId === show._id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Delete Show"
                  >
                      {deletingId === show._id ? <Loading className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  </button>
            </div>      
          </div>
        ))}
      </div>

      {editingShow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full">
                  <h3 className="text-xl font-bold mb-4">Edit Show for {editingShow.movie?.title || "Deleted Movie"}</h3>
                  <form onSubmit={handleUpdateShow}>
                      <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">New Show Price ({currency})</label>
                          <input
                              type="number"
                              name="showPrice"
                              defaultValue={editingShow.showPrice}
                              className="w-full border border-gray-400 dark:border-gray-600 p-2 rounded outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              required
                              min="1"
                          />
                      </div>
                      <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">New Date and Time</label>
                          <input
                              type="datetime-local"
                              name="showDateTime"
                              defaultValue={new Date(editingShow.showDateTime).toISOString().slice(0, 16)} 
                              className="w-full border border-gray-400 dark:border-gray-600 p-2 rounded outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              required
                          />
                      </div>
                      <div className="flex justify-end gap-3">
                          <button
                              type="button"
                              onClick={() => setEditingShow(null)}
                              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                          >
                              Cancel
                          </button>
                          <button
                              type="submit"
                              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition"
                          >
                              Save Changes
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </>
  ) : (
    <Loading />
  );
};

export default Dashboard;
