import { WarmupLayout as WarmupFeatureLayout } from "@/features/warmup/ui/WarmupLayout";

export default function WarmupLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <WarmupFeatureLayout>{children}</WarmupFeatureLayout>;
}