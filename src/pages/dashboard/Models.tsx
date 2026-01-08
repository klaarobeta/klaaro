import { Brain, Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

const Models = () => {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Models</h1>
          <p className="text-muted-foreground">View and manage your trained models</p>
        </div>
        <Link to="/dashboard/new-project">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Train New Model
          </Button>
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search models..." className="pl-9 bg-background" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Empty State */}
      <Card className="bg-card border-border">
        <CardContent className="py-20 text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No models yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Train your first model by creating a new AutoML project. We'll handle the model
            selection, training, and optimization automatically.
          </p>
          <Link to="/dashboard/new-project">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Train Your First Model
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Models;
