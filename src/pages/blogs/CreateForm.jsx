import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../config/axios";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import * as yup from "yup";
const createBlogSchema = (isEditMode = false, hasExistingImage = false) => {
  return yup.object().shape({
    title: yup
      .string()
      .required("Title is required")
      .max(100, "Title cannot exceed 100 characters"),

    author: yup
      .string()
      .required("Author name is required")
      .min(2, "Author name must be at least 2 characters")
      .matches(/^[a-zA-Z\s]+$/, "Author name can only contain letters and spaces"),

    date: yup
      .string()
      .required("Date is required")
      .test("is-valid-date", "Invalid date format", (value) => {
        return value && !isNaN(new Date(value).getTime());
      })
      .test("max-date", "Future dates are not allowed", (value) => {
        return new Date(value) <= new Date();
      }),

    excerpt: yup
      .string()
      .required("Excerpt is required")
      .min(10, "Excerpt must be at least 10 characters")
      .max(500, "Excerpt cannot exceed 500 characters"),

    content: yup
      .string()
      .required("Content is required")
      .test(
        "min-content-length",
        "Content must be at least 50 characters",
        (value) => {
          if (!value) return false;
          const plainText = value.replace(/<[^>]*>/g, "").trim();
          return plainText.length >= 50;
        }
      ),

    image: isEditMode
      ? yup.mixed().nullable().test(
          "file-check",
          "Invalid image file",
          (value) => {
            // If there's an existing image and no new file, skip validation
            if (hasExistingImage && !value) return true;
            // If there's a new file, validate it
            if (value && value instanceof File) {
              const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
              return allowedTypes.includes(value.type) && value.size <= 2 * 1024 * 1024;
            }
            return true; // Allow null/undefined in edit mode
          }
        )
      : yup
          .mixed()
          .required("Image is required")
          .test("fileFormat", "Only JPG, PNG, GIF, and WEBP images are allowed", (value) => {
            if (!value || !(value instanceof File)) return false;
            const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            return allowedTypes.includes(value.type);
          })
          .test("fileSize", "Image size cannot exceed 2MB", (value) => {
            if (!value || !(value instanceof File)) return false;
            return value.size <= 2 * 1024 * 1024;
          }),
  });
};

function BlogPostForm({ onBlogCreated, initialData, mode, setIsDrawerOpen }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading,setIsLoading]=useState(false)
  const inputRef = useRef(null);

  const isEditMode = mode === "edit";
  const hasExistingImage = isEditMode && !!initialData?.image;

  useEffect(() => {
    if (isEditMode && initialData) {
      setTitle(initialData.title || "");
      setAuthor(initialData.author || "");
      setDate(initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : "");
      setExcerpt(initialData.excerpt || "");
      setContent(initialData.content || "");
      setIsPremium(initialData.isPremium || false);
      setImagePreview(initialData.image || null);
      // Reset imageFile to null in edit mode since we're not uploading a new image initially
      setImageFile(null);
      setErrors({})
    } else {
      resetForm();
      
    }
  }, [mode, initialData]);

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setDate("");
    setExcerpt("");
    setContent("");
    setImageFile(null);
    setImagePreview(null);
    setIsPremium(false);
    setErrors({});
    setTouched({});
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = async (field) => {
    try {
      const schema = createBlogSchema(isEditMode, hasExistingImage);
      const fieldSchema = yup.reach(schema, field);
      const value = {
        title,
        author,
        date,
        excerpt,
        content,
        image: imageFile,
      }[field];

      await fieldSchema.validate(value);
      setErrors((prev) => ({ ...prev, [field]: "" }));
      return true;
    } catch (error) {
      setErrors((prev) => ({ ...prev, [field]: error.message }));
      return false;
    }
  };

  const validateForm = async () => {
    setTouched({
      title: true,
      author: true,
      date: true,
      excerpt: true,
      content: true,
      image: true,
    });

    try {
      const schema = createBlogSchema(isEditMode, hasExistingImage);
      await schema.validate(
        { title, author, date, excerpt, content, image: imageFile },
        { abortEarly: false }
      );
      setErrors({});
      return true;
    } catch (validationError) {
      const newErrors = {};
      validationError.inner.forEach((error) => {
        newErrors[error.path] = error.message;
      });
      setErrors(newErrors);
      return false;
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setTouched((prev) => ({ ...prev, image: true }));
      validateField("image");

      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const isValid = await validateForm();
    if (!isValid) {
      // toast.error("Please fix the errors in the form.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("author", author);
    formData.append("date", date);
    formData.append("excerpt", excerpt);
    formData.append("content", content);
    formData.append("isPremium", isPremium.toString());

    // Only append image if a new file was selected
    if (imageFile instanceof File) {
      formData.append("image", imageFile);
    }

    try {
      let response;
      if (mode === "add") {
        setIsLoading(true)

        response = await axiosInstance.post("/blog/create-blog", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Blog post created successfully!");
      } else if (isEditMode && initialData?.id) {
        response = await axiosInstance.put(
          `/blog/update-blog/${initialData.id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setIsLoading(false)
        toast.success("Blog post updated successfully!");
      }

      onBlogCreated?.();
      resetForm();
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Error handling blog post:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Failed to save blog post. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Title */}
      <div className="form-control mb-4">
        <label className="label"><span className="label-text">Title  <span className="text-error pl-1">*</span></span></label>
        <input
          type="text"
          className={`input input-bordered ${errors.title && touched.title ? "input-error" : "border-accent"}`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (touched.title) validateField("title");
          }}
          onBlur={() => handleBlur("title")}
        />
        {errors.title && touched.title && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.title}</span>
          </label>
        )}
      </div>

      {/* Author */}
      <div className="form-control mb-4">
        <label className="label"><span className="label-text">Author  <span className="text-error pl-1">*</span></span></label>
        <input
          type="text"
          className={`input input-bordered ${errors.author && touched.author ? "input-error" : "border-accent"}`}
          value={author}
          onChange={(e) => {
            setAuthor(e.target.value);
            if (touched.author) validateField("author");
          }}
          onBlur={() => handleBlur("author")}
        />
        {errors.author && touched.author && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.author}</span>
          </label>
        )}
      </div>

      {/* Date */}
      <div className="form-control mb-4">
        <label className="label"><span className="label-text">Date  <span className="text-error pl-1">*</span></span></label>
        <input
          type="date"
          className={`input input-bordered ${errors.date && touched.date ? "input-error" : "border-accent"}`}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (touched.date) validateField("date");
          }}
          onBlur={() => handleBlur("date")}
        />
        {errors.date && touched.date && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.date}</span>
          </label>
        )}
      </div>

      {/* Premium Status Dropdown */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Content Type  <span className="text-error pl-1">*</span></span>
        </label>
        <select
          className="select select-bordered border-accent"
          value={isPremium ? "true" : "false"}
          onChange={(e) => setIsPremium(e.target.value === "true")}
        >
          <option value="false">Free Content</option>
          <option value="true">Premium Content</option>
        </select>
      </div>

      {/* Excerpt */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Excerpt  <span className="text-error pl-1">*</span></span>
          {touched.excerpt && (
            <span className="label-text-alt">{excerpt.length}/500 characters</span>
          )}
        </label>
        <textarea
          className={`textarea textarea-bordered ${errors.excerpt && touched.excerpt ? "textarea-error" : "border-accent"}`}
          value={excerpt}
          onChange={(e) => {
            setExcerpt(e.target.value);
            if (touched.excerpt) validateField("excerpt");
          }}
          onBlur={() => handleBlur("excerpt")}
        ></textarea>
        {errors.excerpt && touched.excerpt && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.excerpt}</span>
          </label>
        )}
      </div>

      {/* Image Upload */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Image {!isEditMode && <span className="text-error pl-1">*</span>}</span>
          {isEditMode && <span className="text-xs text-neutral-content">(Only required for new posts)</span>}
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-base-100 ${errors.image && touched.image ? "border-error" : "border-accent"}`}
          onClick={() => inputRef.current?.click()}
        >
          {!imagePreview ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary mb-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v3.586l-1.293-1.293a1 1 0 00-1.414 0L10 12l-2.293-2.293a1 1 0 00-1.414 0L4 12V5zm0 10v-1.586l2.293-2.293a1 1 0 011.414 0L10 13l3.293-3.293a1 1 0 011.414 0L16 12.414V15H4z" />
              </svg>
              <p className="text-neutral-content">Drag and drop or click to upload</p>
              <p className="text-xs text-neutral-content mt-1">JPG, PNG, GIF or WEBP (max 2MB)</p>
            </>
          ) : (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full h-auto rounded-lg shadow-lg" />
              <button
                type="button"
                className="absolute top-2 right-2 btn btn-xs btn-error"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageFile(null);
                  setImagePreview(isEditMode && initialData?.image ? initialData.image : null);
                  setErrors(prev => ({ ...prev, image: "" }));
                  setTouched(prev => ({ ...prev, image: true }));
                  validateField("image");
                }}
              >
                {isEditMode && initialData?.image && imagePreview === initialData.image ? "Reset" : "Remove"}
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg, image/png, image/gif, image/webp"
            className="hidden"
            ref={inputRef}
            onChange={handleImageChange}
          />
        </div>
        {errors.image && touched.image && (
        
          <label className="label">
            <span className="label-text-alt text-error">{errors.image}</span>
          </label>
        )}
      </div>

      {/* Content (ReactQuill) */}
      <div className="form-control mb-4">
        <label className="label"><span className="label-text">Content  <span className="text-error pl-1">*</span></span></label>
        <div className={errors.content && touched.content ? "border border-error rounded" : ""}>
          <ReactQuill
            theme="snow"
            value={content}
            onChange={(value) => {
              setContent(value);
              if (touched.content) validateField("content");
            }}
            onBlur={() => handleBlur("content")}
          />
        </div>
        {errors.content && touched.content && (
          <label className="label">
          {mode === "add" ?<span className="label-text-alt text-error">{errors.content}</span>:<span className="label-text-alt text-error"></span> }
            
          </label>
        )}
      </div>

      {/* Submit Button */}
      <div className="form-control mt-6">
  <button 
    type="submit" 
    className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
    disabled={isLoading}
  >
    {isLoading ? (
      <span className="flex items-center">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading...
      </span>
    ) : (
      mode === "add" ? "Publish" : "Update"
    )}
  </button>
</div>
    </form>
  );
}

export default BlogPostForm;