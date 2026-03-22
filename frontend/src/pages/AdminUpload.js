import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, ImageIcon, Music, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminUpload() {
  const [title, setTitle] = useState("");
  const [priceMp3, setPriceMp3] = useState("29.99");
  const [priceWav, setPriceWav] = useState("49.99");
  const [priceStems, setPriceStems] = useState("99.99");
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const coverInputRef = useRef(null);
  const audioInputRef = useRef(null);
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

  const handleAudioChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!coverFile || !audioFile) {
      toast.error("Please select both cover art and audio file");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("price_mp3", priceMp3);
      formData.append("price_wav", priceWav);
      formData.append("price_stems", priceStems);
      formData.append("cover", coverFile);
      formData.append("audio", audioFile);

      await axios.post(`${API}/beats`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Beat uploaded successfully!");
      navigate("/admin");
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to upload beat";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black" data-testid="admin-upload-page">
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
            className="text-xl font-semibold text-white tracking-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Upload Beat
          </h1>
          <p className="text-sm text-white/50">Add a new beat to your catalog</p>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-8 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/70">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter beat title"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
              data-testid="beat-title-input"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_mp3" className="text-white/70">MP3 Price ($)</Label>
              <Input
                id="price_mp3"
                type="number"
                step="0.01"
                min="0"
                value={priceMp3}
                onChange={(e) => setPriceMp3(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
                data-testid="price-mp3-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_wav" className="text-white/70">WAV Price ($)</Label>
              <Input
                id="price_wav"
                type="number"
                step="0.01"
                min="0"
                value={priceWav}
                onChange={(e) => setPriceWav(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
                data-testid="price-wav-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_stems" className="text-white/70">Stems Price ($)</Label>
              <Input
                id="price_stems"
                type="number"
                step="0.01"
                min="0"
                value={priceStems}
                onChange={(e) => setPriceStems(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
                data-testid="price-stems-input"
              />
            </div>
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

          {/* Audio File */}
          <div className="space-y-2">
            <Label className="text-white/70">Audio File (MP3, WAV)</Label>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="hidden"
              data-testid="audio-file-input"
            />
            
            {audioFile ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Music className="h-5 w-5 text-white/50" />
                    <span className="text-sm text-white truncate max-w-xs">
                      {audioFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAudioFile(null)}
                    className="p-1 text-white/50 hover:text-white"
                    data-testid="remove-audio-btn"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ) : (
              <Card
                onClick={() => audioInputRef.current?.click()}
                className="border-dashed border-2 border-white/20 bg-transparent cursor-pointer hover:border-white/40"
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Music className="h-10 w-10 text-white/30 mb-3" />
                  <p className="text-sm text-white/50">Click to upload audio file</p>
                </CardContent>
              </Card>
            )}
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
              disabled={isUploading || !coverFile || !audioFile || !title}
              className="flex-1 gap-2 bg-white text-black hover:bg-white/90 rounded-full"
              data-testid="upload-submit-btn"
            >
              {isUploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Beat
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
