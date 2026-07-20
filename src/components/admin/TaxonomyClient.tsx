'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Hash } from 'lucide-react';
import { createGenre, updateGenre, deleteGenre, createTag, updateTag, deleteTag } from '@/app/actions/admin/taxonomy';

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconName?: string | null;
  color?: string | null;
  _count: { series: number };
}

export function TaxonomyClient({ type, data }: { type: 'genre' | 'tag', data: TaxonomyItem[] }) {
  const [items, setItems] = useState(data);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxonomyItem | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (editingItem) formData.append('id', editingItem.id);

    try {
      if (type === 'genre') {
        if (editingItem) await updateGenre(formData);
        else await createGenre(formData);
      } else {
        if (editingItem) await updateTag(formData);
        else await createTag(formData);
      }
      setIsModalOpen(false);
      window.location.reload(); // Quick refresh to get updated data
    } catch (err) {
      console.error(err);
      alert('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    setLoading(true);
    try {
      if (type === 'genre') await deleteGenre(id);
      else await deleteTag(id);
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item?: TaxonomyItem) => {
    setEditingItem(item || null);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add {type === 'genre' ? 'Genre' : 'Tag'}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border text-text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Slug</th>
                {type === 'genre' && <th className="px-6 py-4 font-semibold">Color</th>}
                <th className="px-6 py-4 font-semibold">Series Count</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-text-primary">
                    <div className="flex items-center gap-2">
                      {type === 'genre' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-surface text-primary">
                           <Hash className="h-4 w-4" />
                        </div>
                      )}
                      {item.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{item.slug}</td>
                  {type === 'genre' && (
                    <td className="px-6 py-4">
                      {item.color && (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-text-secondary">{item.color}</span>
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-text-secondary">{item._count.series}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal(item)} className="rounded-lg p-2 text-text-secondary hover:bg-primary hover:text-white transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="rounded-lg p-2 text-text-secondary hover:bg-red-500 hover:text-white transition-colors" disabled={loading}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                    No {type}s found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
            <div className="border-b border-border p-5">
              <h2 className="text-xl font-bold text-text-primary">
                {editingItem ? 'Edit' : 'Create'} {type === 'genre' ? 'Genre' : 'Tag'}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-secondary">Name</label>
                <input
                  name="name"
                  defaultValue={editingItem?.name || ''}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text-secondary">Slug</label>
                <input
                  name="slug"
                  defaultValue={editingItem?.slug || ''}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none"
                  required
                />
              </div>
              {type === 'genre' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">Color (Hex)</label>
                    <input
                      name="color"
                      defaultValue={editingItem?.color || ''}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none"
                      placeholder="#E53935"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">Description</label>
                    <textarea
                      name="description"
                      defaultValue={editingItem?.description || ''}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none"
                      rows={3}
                    />
                  </div>
                </>
              )}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-5 py-2.5 font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
