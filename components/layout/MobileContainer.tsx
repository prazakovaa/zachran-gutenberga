type Props = {
  children: React.ReactNode;
};

export default function MobileContainer({
  children,
}: Props) {
  return (
    <div className="min-h-screen w-full bg-[#0B5ED7] text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}