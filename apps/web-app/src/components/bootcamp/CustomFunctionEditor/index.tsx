import { FC } from 'react';
import type { CustomFunctionEditorProps } from './types';

export const CustomFunctionEditor: FC<CustomFunctionEditorProps> = ({ uuid }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h1 className="text-2xl font-bold mb-4">Custom Function Editor</h1>
      <p className="text-gray-600">Editing function: {uuid}</p>
      {/* Add your editor components here */}
    </div>
  );
};