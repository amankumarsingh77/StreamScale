"use client"
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { instance } from '@/api/apiInstance';
import { useToast } from '@/components/ui/use-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Copy, Key, RefreshCw, Trash } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const profileFormSchema = z.object({
  username: z.string().min(2, {
    message: 'Username must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  bio: z.string().max(160).optional(),
});

const apiKeyFormSchema = z.object({
  name: z.string().min(1, {
    message: 'API key name is required.',
  }),
  expiration: z.enum(['24h', '7d', '30d', 'never'], {
    required_error: 'Please select an expiration period.',
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
  isActive: boolean;
}

const SettingsPage: React.FC = () => {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.description || '',
    },
  });

  const apiKeyForm = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: '',
      expiration: '7d',
    },
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await instance.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/api-keys`);
      setApiKeys(response.data.apiKeys);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch API keys. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      const response = await instance.patch('/api/user/update', data);
      setUser(response.data.user);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const onApiKeySubmit = async (data: ApiKeyFormValues) => {
    setIsCreatingKey(true);
    try {
      const response = await instance.post(`${process.env.NEXT_PUBLIC_API_URL}/api/user/api-keys`, data);
      setNewApiKey(response.data.apiKey);
      fetchApiKeys();
      apiKeyForm.reset();
      toast({
        title: 'API Key Created',
        description: 'Your new API key has been created successfully.',
      });
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to create API key. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard.',
    });
  };

  const handleToggleApiKey = async (id: string, isActive: boolean) => {
    try {
      await instance.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/api-keys/${id}`, { isActive });
      fetchApiKeys();
      toast({
        title: isActive ? 'API Key Activated' : 'API Key Deactivated',
        description: `The API key has been ${isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      console.error('Failed to toggle API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to update API key status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    try {
      await instance.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/user/api-keys/${id}`);
      fetchApiKeys();
      toast({
        title: 'API Key Deleted',
        description: 'The API key has been deleted successfully.',
      });
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete API key. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateApiKey = async (id: string) => {
    try {
      const response = await instance.post(`${process.env.NEXT_PUBLIC_API_URL}/api/user/api-keys/${id}/regenerate`);
      setNewApiKey(response.data.apiKey);
      fetchApiKeys();
      toast({
        title: 'API Key Regenerated',
        description: 'Your API key has been regenerated successfully.',
      });
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to regenerate API key. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="space-y-10">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your account profile information.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          This is your public display name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us a little bit about yourself"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          You can <span>@mention</span> other users and organizations to link to them.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button variant={'outline'} type="submit">Update profile</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* API Key Management */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for accessing the StreamScale API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...apiKeyForm}>
                <form onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)} className="space-y-8">
                  <FormField
                    control={apiKeyForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Production API Key" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* <FormField
                    control={apiKeyForm.control}
                    name="expiration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="24h">24 hours</option>
                            <option value="7d">7 days</option>
                            <option value="30d">30 days</option>
                            <option value="never">Never</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  /> */}
                  <Button variant={'outline'} type="submit" disabled={isCreatingKey}>
                    {isCreatingKey ? 'Creating...' : 'Create API Key'}
                  </Button>
                </form>
              </Form>

              {newApiKey && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>New API Key Created</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">Make sure to copy your new API key now. You won't be able to see it again!</p>
                    <div className="flex items-center space-x-2">
                      <code className="px-2 py-1 bg-muted rounded">{newApiKey}</code>
                      <Button size="sm" variant="outline" onClick={() => handleCopyApiKey(newApiKey)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Your API Keys</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>{key.name}</TableCell>
                        <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}</TableCell>
                        <TableCell>{key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</TableCell>
                        <TableCell>
                          <Switch
                            checked={key.isActive}
                            onCheckedChange={(checked) => handleToggleApiKey(key.id, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleRegenerateApiKey(key.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteApiKey(key.id)}>
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SettingsPage;