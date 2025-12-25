export default function RendererLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div 
      className="renderer-root"
      style={{ 
        width: '1920px', 
        height: '1080px', 
        margin: 0, 
        padding: 0, 
        overflow: 'hidden',
        background: 'transparent',
        fontFamily: '"Oswald", "Arial Narrow", sans-serif'
      }}
    >
      {children}
    </div>
  );
}
