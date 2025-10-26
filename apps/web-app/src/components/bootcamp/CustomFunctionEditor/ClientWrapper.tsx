'use client';

import dynamic from 'next/dynamic';

const CustomFunctionEditor = dynamic(
  () => import('./index').then((mod) => mod.CustomFunctionEditor),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-8">Loading editor...</div>
  }
);

interface Props {
  uuid: string;
}

export function CustomFunctionEditorClientWrapper({ uuid }: Props) {
  return <CustomFunctionEditor uuid={uuid} />;
}