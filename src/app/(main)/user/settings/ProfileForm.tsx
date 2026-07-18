'use client';

import { useState, useRef } from 'react';
import { Camera, Save, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateProfile } from './actions';
import { useRouter } from 'next/navigation';

interface ProfileFormProps {
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      const fileInput = fileInputRef.current;
      if (fileInput?.files?.[0]) {
        formData.append('avatar', fileInput.files[0]);
      }

      await updateProfile(formData);
      setSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <User className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Public Profile</h2>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-md text-sm">
          Profile updated successfully!
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5">Username</label>
              <Input id="username" name="username" defaultValue={user.username || ''} placeholder="redbeard_fan" />
            </div>
            
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium mb-1.5">Display Name</label>
              <Input id="displayName" name="displayName" defaultValue={user.displayName || user.username || ''} placeholder="Redbeard Fan" />
            </div>
            
            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1.5">Bio</label>
              <textarea 
                id="bio"
                name="bio"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={user.bio || ''} 
                placeholder="Tell us about yourself..." 
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
            <div 
              className="w-32 h-32 rounded-full border-2 border-border overflow-hidden bg-muted relative group cursor-pointer"
              onClick={handleAvatarClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={avatarPreview || user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.id}`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white mb-1" />
                <span className="text-xs text-white font-medium">Change</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              JPG, GIF or PNG. Max size of 2MB.
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isPending}>
            <Save className="w-4 h-4 mr-2" />
            {isPending ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </section>
  );
}
