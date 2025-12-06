import { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import { CheckIcon, DeleteIcon, Pencil, Save, X, RefreshCw } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const ManageMovies = () => {
  const { axios, getToken, user, image_base_url } = useAppContext();

  const [dbMovies, setDbMovies] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [adding, setAdding] = useState(false);

  // states cho update
  const [editingId, setEditingId] = useState("");
  const [editData, setEditData] = useState({
    title: "",
    tagline: "",
    overview: "",
    release_date: "",
    original_language: "",
  });
  const [savingId, setSavingId] = useState("");
  const [reembedId, setReembedId] = useState("");

  const fetchDbMovies = async () => {
    try {
      const res = await axios.get("/api/movies", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      setDbMovies(res.data.movies || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // fetch phim từ TMDB
  const fetchNowPlaying = async () => {
    try {
      const res = await axios.get("/api/movies/import/tmdb", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (res.data.success) setNowPlaying(res.data.movies || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDbMovies();
      fetchNowPlaying();
    }
  }, [user]);

  const handleAddMovie = async () => {
    if (!selectedMovie) return toast.error("Please select a movie!");
    setAdding(true);
    try {
      const exists = dbMovies.find((m) => m._id === selectedMovie.id);
      if (exists) {
        setAdding(false);
        return toast("Movie already exists in DB");
      }

      await axios.post(
        "/api/movies",
        {
          _id: selectedMovie.id,
          title: selectedMovie.title,
          overview: selectedMovie.overview || "",
          poster_path: selectedMovie.poster_path,
          backdrop_path: selectedMovie.backdrop_path || "",
          release_date: selectedMovie.release_date || "",
          original_language: selectedMovie.original_language || "en",
          tagline: selectedMovie.tagline || "",
          genres: Array.isArray(selectedMovie.genre_ids)
            ? selectedMovie.genre_ids.map((id) => ({ id }))
            : [],
          casts: [],
          vote_average: selectedMovie.vote_average || 0,
          runtime: selectedMovie.runtime || 0,
        },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      toast.success("Movie added!");
      fetchDbMovies();
      setSelectedMovie(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add movie!");
    }
    setAdding(false);
  };

  const handleDeleteMovie = async (id) => {
    if (!window.confirm("Are you sure to delete this movie?")) return;
    try {
      await axios.delete(`/api/movies/${id}`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      toast.success("Deleted!");
      fetchDbMovies();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete!");
    }
  };

  // Bật chế độ edit cho 1 phim
  const startEdit = (movie) => {
    setEditingId(movie._id);
    setEditData({
      title: movie.title || "",
      tagline: movie.tagline || "",
      overview: movie.overview || "",
      release_date: movie.release_date || "",
      original_language: movie.original_language || "",
    });
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditData({
      title: "",
      tagline: "",
      overview: "",
      release_date: "",
      original_language: "",
    });
  };

  // Lưu thay đổi metadata + re-embed (server sẽ re-embed vì có reembed=1 hoặc vì có thay đổi ngữ nghĩa)
  const saveEdit = async (id) => {
    try {
      setSavingId(id);
      await axios.put(
        `/api/movies/${id}?reembed=1`,
        { ...editData, force_reembed: true },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      toast.success("Movie updated!");
      setEditingId("");
      fetchDbMovies();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update movie!");
    } finally {
      setSavingId("");
    }
  };

  // Ép re-embed nhanh không đổi metadata
  const quickReembed = async (id) => {
    try {
      setReembedId(id);
      await axios.post(
        `/api/movies/${id}/reembed`,
        {},
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      toast.success("Re-embedded!");
      fetchDbMovies();
    } catch (err) {
      console.error(err);
      toast.error("Re-embed failed!");
    } finally {
      setReembedId("");
    }
  };

  if (!user) return <Loading />;

  return (
    <div className="container mx-auto p-4">
      <Title text1="Manage" text2="Movies" />

      <p className="mt-4 text-lg font-medium">Now Playing (TMDB)</p>
      <div className="flex flex-wrap gap-4 mt-4">
        {nowPlaying.map((movie) => (
          <div
            key={movie.id}
            className={`relative cursor-pointer rounded-lg overflow-hidden w-40 transition-all duration-300 ${
              selectedMovie?.id === movie.id ? "opacity-100" : "opacity-70 hover:opacity-100"
            }`}
            onClick={() => setSelectedMovie(movie)}
          >
            <img
              src={image_base_url + movie.poster_path}
              alt={movie.title}
              className="w-full object-cover brightness-90"
            />
            <div className="p-1 text-sm flex justify-between bg-black/70 absolute bottom-0 left-0 w-full text-gray-200">
              <span>{movie.release_date}</span>
              <span>{((movie.vote_average ?? 0)).toFixed(1)}</span>
            </div>
            {selectedMovie?.id === movie.id && (
              <div className="absolute top-2 right-2 bg-primary h-6 w-6 flex items-center justify-center rounded">
                <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleAddMovie}
        disabled={adding || !selectedMovie}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-4 hover:bg-blue-600 disabled:opacity-60"
      >
        {adding ? "Adding..." : "Add Selected Movie"}
      </button>

      <p className="mt-8 text-lg font-medium">Movies in Database</p>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {dbMovies.map((movie) => {
          const isEditing = editingId === movie._id;
          return (
            <div
              key={movie._id}
              className="border rounded p-2 flex flex-col relative"
            >
              <div className="flex items-start gap-3">
                <img
                  src={image_base_url + movie.poster_path}
                  alt={movie.title}
                  className="w-24 h-32 object-cover rounded"
                />

                {/* Info / Edit form */}
                <div className="flex-1 min-w-0">
                  {!isEditing ? (
                    <>
                      <div className="font-semibold truncate">{movie.title}</div>
                      <div className="text-sm text-gray-600 truncate">{movie.tagline}</div>
                      <div className="text-xs text-gray-500">{movie.release_date}</div>
                      <div className="text-xs text-gray-500">Lang: {movie.original_language}</div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Title"
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      />
                      <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Tagline"
                        value={editData.tagline}
                        onChange={(e) => setEditData({ ...editData, tagline: e.target.value })}
                      />
                      <textarea
                        className="w-full border rounded px-2 py-1 text-sm"
                        rows={3}
                        placeholder="Overview"
                        value={editData.overview}
                        onChange={(e) => setEditData({ ...editData, overview: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <input
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          placeholder="Release date (YYYY-MM-DD)"
                          value={editData.release_date}
                          onChange={(e) => setEditData({ ...editData, release_date: e.target.value })}
                        />
                        <input
                          className="w-28 border rounded px-2 py-1 text-sm"
                          placeholder="Lang"
                          value={editData.original_language}
                          onChange={(e) => setEditData({ ...editData, original_language: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center justify-between">
                {!isEditing ? (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(movie)}
                        className="bg-amber-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-amber-600"
                        title="Edit movie"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => quickReembed(movie._id)}
                        disabled={reembedId === movie._id}
                        className="bg-indigo-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-indigo-700 disabled:opacity-60"
                        title="Re-embed now"
                      >
                        <RefreshCw className="w-3 h-3" />
                        {reembedId === movie._id ? "Re-embedding..." : "Re-embed"}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteMovie(movie._id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-red-600"
                      title="Delete movie"
                    >
                      <DeleteIcon className="w-3 h-3" />
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(movie._id)}
                        disabled={savingId === movie._id}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-blue-700 disabled:opacity-60"
                        title="Save changes"
                      >
                        <Save className="w-3 h-3" />
                        {savingId === movie._id ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-gray-300"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                    <div />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManageMovies;
