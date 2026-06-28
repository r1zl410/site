import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LogOut, Trash2, Music, DollarSign, Package } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const [beats, setBeats] = useState([]);
  const [packs, setPacks] = useState([]);
  const [stats, setStats] = useState({ total_beats: 0, total_payments: 0, total_revenue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [deletingBeatId, setDeletingBeatId] = useState(null);
  const [deletingPackId, setDeletingPackId] = useState(null);
  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem("admin_token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        navigate("/admin/login");
        return;
      }

      try {
        const [beatsRes, packsRes, statsRes] = await Promise.all([
          axios.get(`${API}/beats`),
          axios.get(`${API}/packs`),
          axios.get(`${API}/stats`, { headers: getAuthHeaders() })
        ]);
        setBeats(beatsRes.data);
        setPacks(packsRes.data);
        setStats(statsRes.data);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("admin_token");
          navigate("/admin/login");
        } else {
          toast.error("Failed to load data");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const handleDeleteBeat = async (beatId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo beat?")) return;

    setDeletingBeatId(beatId);
    try {
      await axios.delete(`${API}/beats/${beatId}`, { headers: getAuthHeaders() });
      setBeats(beats.filter((b) => b.id !== beatId));
      setStats((prev) => ({ ...prev, total_beats: prev.total_beats - 1 }));
      toast.success("Beat eliminato");
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    } finally {
      setDeletingBeatId(null);
    }
  };

  const handleDeletePack = async (packId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo pack?")) return;

    setDeletingPackId(packId);
    try {
      await axios.delete(`${API}/packs/${packId}`, { headers: getAuthHeaders() });
      setPacks(packs.filter((p) => p.id !== packId));
      toast.success("Pack eliminato");
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    } finally {
      setDeletingPackId(null);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(amount);
  };

  const getCoverUrl = (item) => {
    if (item.cover_url) return item.cover_url;
    if (item.cover_path) return `${API}/files/${item.cover_path}`;
    return "https://images.unsplash.com/photo-1706720095318-e3538cae10bf?w=200&q=80";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black" data-testid="admin-dashboard">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className="text-xl font-bold text-white tracking-tighter hover:opacity-70"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            r1zl410
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white/50">Admin</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="gap-2 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
          data-testid="sign-out-btn"
        >
          <LogOut className="h-4 w-4" />
          Esci
        </Button>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-white/50 flex items-center gap-2">
                <Music className="h-4 w-4" />
                Beats Totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white" data-testid="stat-total-beats">
                {beats.length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-white/50 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Packs Totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white" data-testid="stat-total-packs">
                {packs.length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-white/50 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Ricavi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white" data-testid="stat-revenue">
                {formatPrice(stats.total_revenue)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Beats and Packs */}
        <Tabs defaultValue="beats" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white/5">
              <TabsTrigger value="beats" className="data-[state=active]:bg-white data-[state=active]:text-black">
                <Music className="h-4 w-4 mr-2" />
                Beats
              </TabsTrigger>
              <TabsTrigger value="packs" className="data-[state=active]:bg-white data-[state=active]:text-black">
                <Package className="h-4 w-4 mr-2" />
                Packs
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-3">
              <Link to="/admin/upload">
                <Button className="gap-2 bg-white text-black hover:bg-white/90 rounded-full px-6" data-testid="upload-beat-btn">
                  <Plus className="h-4 w-4" />
                  Nuovo Beat
                </Button>
              </Link>
              <Link to="/admin/upload-pack">
                <Button className="gap-2 bg-red-500 text-white hover:bg-red-600 rounded-full px-6" data-testid="upload-pack-btn">
                  <Plus className="h-4 w-4" />
                  Nuovo Pack
                </Button>
              </Link>
            </div>
          </div>

          {/* Beats Tab */}
          <TabsContent value="beats">
            {beats.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Music className="h-12 w-12 text-white/30 mb-4" />
                  <p className="text-lg text-white/50 mb-4">Nessun beat caricato</p>
                  <Link to="/admin/upload">
                    <Button className="bg-white text-black hover:bg-white/90 rounded-full">
                      Carica il tuo primo beat
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {beats.map((beat) => (
                  <Card 
                    key={beat.id} 
                    className="bg-white/5 border-white/10 overflow-hidden"
                    data-testid={`admin-beat-card-${beat.id}`}
                  >
                    <div className="relative aspect-square">
                      <img
                        src={getCoverUrl(beat)}
                        alt={beat.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-white">{beat.title}</h3>
                          <p className="text-sm text-white/50">
                            MP3: {formatPrice(beat.price_mp3)} / WAV: {formatPrice(beat.price_wav)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBeat(beat.id)}
                          disabled={deletingBeatId === beat.id}
                          className="text-white/50 hover:text-red-500 hover:bg-red-500/10"
                          data-testid={`delete-beat-${beat.id}`}
                        >
                          {deletingBeatId === beat.id ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Packs Tab */}
          <TabsContent value="packs">
            {packs.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="h-12 w-12 text-white/30 mb-4" />
                  <p className="text-lg text-white/50 mb-4">Nessun pack caricato</p>
                  <Link to="/admin/upload-pack">
                    <Button className="bg-red-500 text-white hover:bg-red-600 rounded-full">
                      Carica il tuo primo pack
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packs.map((pack) => (
                  <Card 
                    key={pack.id} 
                    className="bg-white/5 border-white/10 overflow-hidden"
                    data-testid={`admin-pack-card-${pack.id}`}
                  >
                    <div className="relative aspect-square">
                      <img
                        src={getCoverUrl(pack)}
                        alt={pack.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        PACK
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-white">{pack.title}</h3>
                          <p className="text-sm text-white/50 line-clamp-1">
                            {pack.description || "Sound Pack"}
                          </p>
                          <p className="text-sm text-white/70 mt-1">
                            {formatPrice(pack.price)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePack(pack.id)}
                          disabled={deletingPackId === pack.id}
                          className="text-white/50 hover:text-red-500 hover:bg-red-500/10"
                          data-testid={`delete-pack-${pack.id}`}
                        >
                          {deletingPackId === pack.id ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
