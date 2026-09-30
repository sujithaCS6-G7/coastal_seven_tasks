import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center p-8 border border-border shadow-sm">
        <CardContent className="space-y-4 p-0">
          <div className="text-6xl font-black text-primary/80">404</div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Page Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="pt-4">
            <Link to="/">
              <Button>
                <Home className="h-4 w-4 mr-2" /> Return to Store Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFoundPage;
