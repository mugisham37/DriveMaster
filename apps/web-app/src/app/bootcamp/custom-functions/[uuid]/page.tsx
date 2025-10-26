import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dynamic from 'next/dynamic';
const CustomFunctionEditor = dynamic(
  () => import('@/components/bootcamp/CustomFunctionEditor').then((mod) => mod.CustomFunctionEditor),
  { ssr: false }
);

interface Props {
  params: {
    uuid: string;
  };
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  return {
    title: `Custom Function Editor - DriveMaster Bootcamp`,
    description: `Edit custom function: ${params.uuid}`,
  };
}

export default async function Page({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return notFound();
  }

  try {

    return (
      <div className="container mx-auto px-4 py-8">
        <CustomFunctionEditor uuid={params.uuid} />
      </div>
    );
  } catch (error) {
    console.error("Error loading custom function:", error);
    return notFound();
  }
}
