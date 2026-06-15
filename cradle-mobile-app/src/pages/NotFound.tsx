import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center">
      <p className="text-6xl mb-4">🍼</p>
      <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground mb-6 text-sm">Page not found</p>
      <Button className="rounded-2xl" onClick={() => navigate("/connect")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Go Home
      </Button>
    </div>
  );
};

export default NotFound;
