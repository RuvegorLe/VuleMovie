import { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import { CheckIcon, DeleteIcon } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const AddShows = () => {
  const { axios, getToken, user, image_base_url } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dateTimeInput, setDateTimeInput] = useState("");
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [showPrice, setShowPrice] = useState("");
  const [addingShow, setAddingShow] = useState(false);

const fetchMovies = async () => {
  try {
    const { data } = await axios.get("/api/movies", {
      headers: { Authorization: `Bearer ${await getToken()}` },
    });
    setMovies(data.movies || data); 
  } catch (error) {
    console.error(error);
  }
};


  useEffect(() => {
    if (user) fetchMovies();
  }, [user]);

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return;
    const [date, time] = dateTimeInput.split("T");
    if (!date || !time) return;
    setDateTimeSelection((prev) => {
      const times = prev[date] || [];
      if (!times.includes(time)) {
        return { ...prev, [date]: [...times, time] };
      }
      return prev;
    });
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const filteredTimes = prev[date].filter((t) => t !== time);
      if (filteredTimes.length === 0) {
        const { [date]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [date]: filteredTimes };
    });
  };

  const handleSubmit = async () => {
    if (!selectedMovie || !showPrice || Object.keys(dateTimeSelection).length === 0) {
      return toast.error("Missing required fields");
    }

    setAddingShow(true);

    try {
      const showsInput = Object.entries(dateTimeSelection).map(([date, times]) => ({
        date,
        time: times,
      }));

      const payload = {
        movieId: selectedMovie,
        showsInput,
        showPrice: Number(showPrice),
      };

      const { data } = await axios.post("/api/show/add", payload, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        toast.success("Show added successfully!");
        setSelectedMovie(null);
        setDateTimeSelection({});
        setShowPrice("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error adding show!");
    }

    setAddingShow(false);
  };
  
  return movies.length === 0 ? (
    <Loading />
  ) : (
    <>
      <Title text1="Add" text2="Shows" />
      <p className="mt-10 text-lg font-medium">Available Movies</p>
      <div className="overflow-x-auto pb-4">
        <div className="group flex flex-wrap gap-4 mt-4 w-max">
          {movies.map((movie) => (
            <div
              key={movie._id}
              className={`relative max-w-40 cursor-pointer hover:-translate-y-1 transition duration-300 ${
                selectedMovie === movie._id ? "opacity-100" : "opacity-70"
              }`}
              onClick={() => setSelectedMovie(movie._id)}
            >
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={image_base_url + movie.poster_path}
                  alt={movie.title}
                  className="w-full object-cover brightness-90"
                />
              </div>
              {selectedMovie === movie._id && (
                <div className="absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded">
                  <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
              )}
              <p className="font-medium truncate">{movie.title}</p>
              <p className="text-gray-400 text-sm">{movie.release_date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Show Price */}
      <div className="mt-8">
        <label className="block text-sm font-medium mb-2">Show Price</label>
        <div className="inline-flex items-center gap-2 border border-gray-600 px-3 py-2 rounded-md">
          <p className="text-gray-400 text-sm">{currency}</p>
          <input
            min={0}
            type="number"
            value={showPrice}
            onChange={(e) => setShowPrice(e.target.value)}
            placeholder="Enter show price"
            className="outline-none"
          />
        </div>
      </div>

      {/* Date & Time */}
      <div className="mt-6">
        <label className="block text-sm font-medium mb-2">Select Date and Time</label>
        <div className="inline-flex gap-5 border border-gray-600 p-1 pl-3 rounded-lg">
          <input
            type="datetime-local"
            value={dateTimeInput}
            onChange={(e) => setDateTimeInput(e.target.value)}
            className="outline-none rounded-md"
          />
          <button
            type="button"
            onClick={handleDateTimeAdd}
            className="bg-primary/80 text-white px-3 py-2 text-sm rounded-lg hover:bg-primary cursor-pointer"
          >
            Add Time
          </button>
        </div>
      </div>

      {/* Display Selected Times */}
      {Object.keys(dateTimeSelection).length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2">Selected Date-Time</h2>
          <ul className="space-y-3">
            {Object.entries(dateTimeSelection).map(([date, times]) => (
              <li key={date}>
                <div className="font-medium">{date}</div>
                <div className="flex flex-wrap gap-2 mt-1 text-sm">
                  {times.map((time) => (
                    <div
                      key={time}
                      className="border border-primary px-2 py-1 flex items-center rounded"
                    >
                      <span>{time}</span>
                      <button onClick={() => handleRemoveTime(date, time)} className="ml-2 text-red-500 hover:text-red-700">x</button>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={addingShow}
        className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
      >
        Add Show
      </button>
    </>
  );
};

export default AddShows;
