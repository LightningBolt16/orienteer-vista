
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

const NotFound: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-7xl font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-6">{t('pageNotFound') || 'Oops! Page not found'}</p>
      <Link to="/">
        <Button variant="default">
          {t('returnHome') || 'Return to Home'}
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
