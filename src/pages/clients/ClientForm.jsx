import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../config/axios";
import * as yup from "yup";

// Define validation schema with Yup
const clientSchema = yup.object().shape({
  title: yup
    .string()
    .required("Client name is required")
    .max(100, "Client name cannot exceed 100 characters"),
  
  website: yup
    .string()
    .required("Website URL is required")
    .url("Please enter a valid URL (e.g., https://example.com)")
    .max(255, "Website URL cannot exceed 255 characters"),
  
  content: yup
    .string()
    .required("Description is required")
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description cannot exceed 1000 characters"),
  
  image: yup
    .mixed()
    .required("Logo image is required") // Changed to required
    .test(
      "fileFormat", 
      "Only JPG, PNG, GIF and WEBP images are allowed",
      value => {
        if (!value) return false; // Will fail if no image
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        return allowedTypes.includes(value.type);
      }
    )
    .test(
      "fileSize", 
      "Image size cannot exceed 2MB", 
      value => {
        if (!value) return false; // Will fail if no image
        return value.size <= 2 * 1024 * 1024;
      }
    )
});

function ClientForm({ onClientCreated, refreshClientList, initialData, mode, setIsDrawerOpen }) {
  const [title, setTitle] = useState("");
  const [website, setWebsite] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading,setIsLoading]=useState(false)
  const inputRef = useRef(null);
  
  // Add validation states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setTitle(initialData.name || "");
      setWebsite(initialData.website || "");
      setContent(initialData.description || "");
      setImagePreview(initialData.logo || null);
      
      // For edit mode, if there's an existing logo but no file,
      // we need to handle validation differently
      setErrors({})
      if (initialData.logo && !imageFile) {
        setErrors(prev => ({ ...prev, image: "" }));
      }
    } else if (mode === "add") {
      resetForm();
    }
  }, [mode, initialData]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setTouched(prev => ({ ...prev, image: true }));
      validateField("image", file);
    } else {
      handleRemoveImage();
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setTouched(prev => ({ ...prev, image: true })); // Mark as touched when removed
    setErrors(prev => ({ ...prev, image: "Logo image is required" })); // Set error when removed
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setTitle("");
    setWebsite("");
    setContent("");
    setImageFile(null);
    setImagePreview(null);
    setErrors({});
    setTouched({});
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // Mark field as touched when user interacts with it
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };
  
  // Validate a specific field using Yup
  const validateField = async (field, value = null) => {
    try {
      // Special case for edit mode with existing image
      if (field === "image" && mode === "edit" && initialData?.logo && !value && !imageFile) {
        setErrors(prev => ({ ...prev, [field]: "" }));
        return true;
      }

      const fieldSchema = yup.reach(clientSchema, field);
      
      // Get the field's current value if not provided
      const fieldValue = value !== null ? value : 
                        field === "title" ? title :
                        field === "website" ? website :
                        field === "content" ? content :
                        field === "image" ? imageFile : null;
                    
      await fieldSchema.validate(fieldValue);
      
      // Clear error if validation passes
      setErrors(prev => ({ ...prev, [field]: "" }));
      return true;
    } catch (error) {
      // Set error message
      setErrors(prev => ({ ...prev, [field]: error.message }));
      return false;
    }
  };
  
  // Validate all fields
  const validateForm = async () => {
    // Mark all fields as touched
    const allFields = ["title", "website", "content", "image"];
    const allTouched = allFields.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    
    setTouched(allTouched);
    
    try {
      // Special case for edit mode with existing image but no new file
      if (mode === "edit" && initialData?.logo && !imageFile) {
        // Validate only the other fields
        await yup.object({
          title: clientSchema.fields.title,
          website: clientSchema.fields.website,
          content: clientSchema.fields.content
        }).validate({ title, website, content }, { abortEarly: false });
        
        // Clear any image errors
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      } else {
        // Normal validation for all fields
        await clientSchema.validate(
          { 
            title, 
            website, 
            content, 
            image: imageFile 
          }, 
          { abortEarly: false }
        );
        setErrors({});
      }
      return true;
    } catch (validationError) {
      // Process all validation errors
      const newErrors = {};
      validationError.inner.forEach(error => {
        newErrors[error.path] = error.message;
      });
      
      setErrors(newErrors);
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validate all fields before submission
    const isValid = await validateForm();
    if (!isValid) {
      // toast.error("Please fix the errors in the form.");
      return;
    }

    const formData = new FormData();
    formData.append("name", title);
    formData.append("website", website);
    formData.append("description", content);
    
    if (imageFile) {
      formData.append("logo", imageFile);
    }

    try {
      setIsLoading(true); // Set loading to true at the start of submission
      
      if (mode === "add") {
        await axiosInstance.post("/client/create-client", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Client created successfully!");
      } else if (mode === "edit" && initialData) {
        await axiosInstance.put(
          `/client/update-client/${initialData.id}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        toast.success("Client updated successfully!");
      }

      if (refreshClientList) {
        refreshClientList();
      }

      resetForm();
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Error handling client:", error);
      toast.error("Failed to save client. Please try again.");
    } finally {
      setIsLoading(false); // Reset loading state regardless of success or failure
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Title Input */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Title <span className="text-red-500">*</span></span>
        </label>
        <input
          type="text"
          placeholder="Client name"
          className={`input input-bordered ${errors.title && touched.title ? "input-error" : ""}`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (touched.title) validateField("title", e.target.value);
          }}
          onBlur={() => handleBlur("title")}
        />
        {errors.title && touched.title && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.title}</span>
          </label>
        )}
      </div>

      {/* Website Input */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Website <span className="text-red-500">*</span></span>
        </label>
        <input
          type="url"
          placeholder="Enter website URL"
          className={`input input-bordered ${errors.website && touched.website ? "input-error" : ""}`}
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            if (touched.website) validateField("website", e.target.value);
          }}
          onBlur={() => handleBlur("website")}
        />
        {errors.website && touched.website && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.website}</span>
          </label>
        )}
      </div>

      {/* Content Input */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Description <span className="text-red-500">*</span></span>
          <span className="label-text-alt">{content.length}/1000 characters</span>
        </label>
        <textarea
          className={`textarea textarea-bordered ${errors.content && touched.content ? "textarea-error" : ""}`}
          placeholder="Write client description..."
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (touched.content) validateField("content", e.target.value);
          }}
          onBlur={() => handleBlur("content")}
        ></textarea>
        {errors.content && touched.content && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.content}</span>
          </label>
        )}
      </div>

      {/* Image Upload */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Logo <span className="text-red-500">*</span></span>
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-base-100 ${errors.image && touched.image ? "border-error" : ""}`}
          onClick={() => inputRef.current?.click()}
        >
          {!imagePreview ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-primary mb-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M4 3a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v3.586l-1.293-1.293a1 1 0 00-1.414 0L10 12l-2.293-2.293a1 1 0 00-1.414 0L4 12V5zm0 10v-1.586l2.293-2.293a1 1 0 011.414 0L10 13l3.293-3.293a1 1 0 011.414 0L16 12.414V15H4z" />
              </svg>
              <p className="text-neutral-content">Drag and drop or click to upload</p>
              <p className="text-xs text-neutral-content mt-1">JPG, PNG, GIF or WEBP (max 2MB)</p>
            </>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-auto rounded-lg shadow-lg"
              />
              <button
                type="button"
                className="absolute top-2 right-2 btn btn-xs btn-error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
              >
                Remove
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

export default ClientForm;