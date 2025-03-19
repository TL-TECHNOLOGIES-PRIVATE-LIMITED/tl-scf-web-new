import { useState, useEffect, useCallback } from "react";
import { Search, Filter } from "lucide-react";
import BlogPostForm from "./CreateForm";
import BlogCard from "./BlogCard";
import axiosInstance from "../../config/axios";

function BlogsLayout() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editBlog, setEditBlog] = useState(null);
  const [mode, setMode] = useState("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [contentFilter, setContentFilter] = useState("all"); // "all", "free", or "premium"

  const refreshBlogList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/blog/get-all-blogs");
      setBlogs(response.data.data);
    } catch (err) {
      setError("Failed to load blogs");
      console.error("Error fetching blogs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/blog/get-all-blogs");
        setBlogs(response.data.data);
      } catch (err) {
        setError("Failed to load blogs");
        console.error("Error fetching blogs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const handleDeleteBlog = (blogId) => {
    setBlogs((prevBlogs) => prevBlogs.filter((blog) => blog.id !== blogId));
  };

  const handleEditBlog = (blog) => {
    setEditBlog(blog);
    setMode("edit");
    setIsDrawerOpen(true);
  };

  const handleAddNewPost = () => {
    setEditBlog("");
    setMode("add");
    setIsDrawerOpen(true);
  };

  // Apply both search and content type filters
  const filteredBlogs = blogs.filter((blog) => {
    // First apply search filter
    const matchesSearch = 
      blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Then apply content type filter
    if (contentFilter === "all") {
      return matchesSearch;
    } else if (contentFilter === "premium") {
      return matchesSearch && blog.isPremium === true;
    } else { // "free"
      return matchesSearch && (blog.isPremium === false || blog.isPremium === undefined);
    }
  });

  return (
    <div className="min-h-screen relative">
      {/* Drawer */}
      <div className="drawer drawer-end">
        <input
          id="new-post-drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={isDrawerOpen}
          onChange={() => setIsDrawerOpen(!isDrawerOpen)}
        />
        <div className="drawer-content">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-content">Blogs</h1>
            <button
              className="btn btn-primary text-white gap-2"
              onClick={handleAddNewPost}
            >
              + New post
            </button>
          </div>

          {/* Search and Filter Section */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search post..."
                className="input input-bordered w-full focus:outline-none pl-10 bg-base-100 text-neutral-content"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Content Type Filter Dropdown */}
            <div className="relative">
              <div className="flex items-center">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  className="select select-bordered pl-10 pr-8 focus:outline-none bg-base-100 text-neutral-content appearance-none"
                  value={contentFilter}
                  onChange={(e) => setContentFilter(e.target.value)}
                >
                  <option value="all">All Content</option>
                  <option value="free">Free Only</option>
                  <option value="premium">Premium Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Blog Count Display */}
          <div className="mb-4 text-neutral-content">
            <p>
              Showing {filteredBlogs.length} {contentFilter !== "all" ? 
                `${contentFilter} ${filteredBlogs.length === 1 ? 'blog' : 'blogs'}` : 
                (filteredBlogs.length === 1 ? 'blog' : 'blogs')}
            </p>
          </div>

          {/* Blog Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="card bg-base-100 animate-pulse transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                  {/* Image Skeleton */}
                  <div className="h-48 bg-base-100 rounded-3xl transition-colors duration-300"></div>

                  {/* Content Skeleton */}
                  <div className="card-body p-4 space-y-3">
                    <div className="h-4 bg-base-200 w-1/2 transition-colors duration-300"></div>
                    <div className="h-6 bg-base-200 w-3/4 transition-colors duration-300"></div>
                    <div className="h-4 bg-base-200 w-full transition-colors duration-300"></div>

                    {/* Stats Skeleton */}
                    <div className="flex gap-4 mt-4">
                      <div className="h-4 bg-base-200 w-1/4 transition-colors duration-300"></div>
                      <div className="h-4 bg-base-200 w-1/4 transition-colors duration-300"></div>
                      <div className="h-4 bg-base-200 w-1/4 transition-colors duration-300"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center p-8 bg-base-200 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">No blogs found</h3>
              <p className="text-neutral-content">
                {searchQuery ? 
                  `No blogs matching "${searchQuery}" in ${contentFilter} content` : 
                  `No ${contentFilter} blogs available`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBlogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  onDelete={handleDeleteBlog}
                  onEdit={() => handleEditBlog(blog)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Drawer Sidebar */}
        <div className="drawer-side">
          <label htmlFor="new-post-drawer" className="drawer-overlay"></label>
          <div className="p-4 md:w-[40%] w-full sm:w-1/2 overflow-y-scroll bg-base-100 h-[85vh] text-base-content absolute bottom-4 right-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-4">
              {editBlog ? "Edit Post" : "Add New Post"}
            </h2>
            <BlogPostForm
              onBlogCreated={refreshBlogList}
              initialData={editBlog}
              mode={mode}
              setIsDrawerOpen={setIsDrawerOpen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlogsLayout;