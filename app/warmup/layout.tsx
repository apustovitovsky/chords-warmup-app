import { StoreProvider } from "@/app/providers/StoreProvider";
import { WarmupLayout as WarmupFeatureLayout } from "@/features/warmup/ui/WarmupLayout";

export default function WarmupLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <StoreProvider>
            <WarmupFeatureLayout>{children}</WarmupFeatureLayout>
        </StoreProvider>
    );
}