import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, ImageIcon, X, Package } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminUploadPack() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("29.99");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const coverInputRef = useRef(null);
  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem("admin_token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!coverFile) {
      toast.error("Please select a cover image");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("cover", coverFile);

      await axios.post(`${API}/packs`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Pack uploaded successfully!");
      navigate("/admin");
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to upload pack";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black" data-testid="admin-upload-pack-page">
      {/* Header */}
      <header className="flex items-center gap-4 px-8 py-6 border-b border-white/10">
        <Link 
          to="/admin" 
          className="p-2 text-white/50 hover:text-white"
          data-testid="back-to-admin-btn"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 
            className="text-xl font-semibold text-white tracking-tight flex items-center gap-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            <Package className="h-5 w-5 text-red-500" />
            Upload Pack
          </h1>
          <p className="text-sm text-white/50">Add a new drum kit or sound pack</p>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-8 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/70">Pack Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DARK TRAP KIT VOL.1"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
              data-testid="pack-title-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/70">Description / Contents</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 50+ Drums, 30+ Melody Loops, 20+ 808s, 15+ Hi-Hats..."
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 resize-none"
              data-testid="pack-description-input"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-white/70">Price (€)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white focus:border-white/30"
              data-testid="pack-price-input"
            />
          </div>

          {/* Cover Art */}
          <div className="space-y-2">
            <Label className="text-white/70">Cover Art (1:1 ratio recommended)</Label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
              data-testid="cover-file-input"
            />
            
            {coverPreview ? (
              <div className="relative w-48 h-48 rounded-xl overflow-hidden">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                  data-testid="remove-cover-btn"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Card
                onClick={() => coverInputRef.current?.click()}
                className="border-dashed border-2 border-white/20 bg-transparent cursor-pointer hover:border-white/40"
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="h-10 w-10 text-white/30 mb-3" />
                  <p className="text-sm text-white/50">Click to upload cover art</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info box */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm">
              <strong>Tip:</strong> Include details about what's in the pack (number of drums, loops, one-shots, etc.) in the description.
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Link to="/admin" className="flex-1">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isUploading || !coverFile || !title}
              className="flex-1 gap-2 bg-red-500 text-white hover:bg-red-600 rounded-full"
              data-testid="upload-pack-submit-btn"
            >
              {isUploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Pack
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
