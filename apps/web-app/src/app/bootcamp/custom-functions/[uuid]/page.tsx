import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CustomFunctionEditor } from "@/components/bootcamp";

interface CustomFunctionEditorPageProps {
  params: { uuid: string };
}

export async function generateMetadata({
  params,
}: CustomFunctionEditorPageProps): Promise<Metadata> {
  return {
    title: `Custom Function Editor - Exercism Bootcamp`,
    description: `Edit custom function: ${params.uuid}`,
  };
}

export default async function CustomFunctionEditorPage({
  params,
}: CustomFunctionEditorPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return notFound();
  }

  try {
    // Mock custom function data
    const customFunction = {
      uuid: params.uuid,
      name: "myCustomFunction",
      active: true,
      description: "A custom function for bootcamp exercises",
      predefined: false,
      code: 'function myCustomFunction() {\n  // Your code here\n  return "Hello World";\n}',
      tests: [
        {
          uuid: "test-1",
          name: "Test 1",
          code: "myCustomFunction()",
          expected: "Hello World",
        },
      ],
    };

    const customFunctions = [customFunction];

    const links = {
      updateCustomFns: `/api/bootcamp/custom-functions/${params.uuid}`,
      customFnsDashboard: "/bootcamp/custom-functions",
      deleteCustomFn: `/api/bootcamp/custom-functions/${params.uuid}/delete`,
    };

    return (
      <CustomFunctionEditor
        customFunction={customFunction}
        customFunctions={customFunctions}
        links={links}
      />
    );
  } catch (error) {
    console.error("Error loading custom function:", error);
    return notFound();
  }
}
