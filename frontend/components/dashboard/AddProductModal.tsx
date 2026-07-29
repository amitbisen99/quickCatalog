import { useRouter } from 'next/router';
import Modal from '@/components/Modal';
import { PencilIcon, PlusIcon } from '@/components/icons';

interface Props {
  catalogId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddProductModal({ catalogId, isOpen, onClose }: Props) {
  const router = useRouter();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Product">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => {
            onClose();
            router.push(`/dashboard/catalogs/${catalogId}/products/create`);
          }}
          className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 p-6 text-center hover:border-primary-300 hover:bg-primary-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <PencilIcon className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Create New</span>
          <span className="text-xs text-gray-500">Add a brand new product</span>
        </button>

        <button
          onClick={() => {
            onClose();
            router.push(`/dashboard/catalogs/${catalogId}/products/add-existing`);
          }}
          className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 p-6 text-center hover:border-primary-300 hover:bg-primary-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-100 text-secondary-700">
            <PlusIcon className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Add Existing</span>
          <span className="text-xs text-gray-500">Reuse a product from your library</span>
        </button>
      </div>
    </Modal>
  );
}
