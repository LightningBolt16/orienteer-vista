
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
      <div className="glass-card p-8 text-center max-w-md">
        <h1 className="text-6xl font-bold text-orienteering mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          The page you're looking for doesn't exist
        </p>
        <Button asChild>
          <Link to="/" className="flex items-center">
            <HomeIcon className="h-4 w-4 mr-2" />
            Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
