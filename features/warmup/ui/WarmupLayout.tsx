type WarmupLayoutProps = {
    children: React.ReactNode;
};

export function WarmupLayout({ children }: WarmupLayoutProps) {
    return (
        <main className="mx-auto min-h-screen w-full max-w-7xl p-4 md:p-6 lg:p-8">
            {children}
        </main>
    );
}