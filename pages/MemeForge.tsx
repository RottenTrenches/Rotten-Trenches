import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { Palette, Download, Trash2, Paintbrush, Eraser, Square } from "lucide-react";
import { toast } from "sonner";

const CANVAS_SIZE = 400;
const GRID_SIZE = 16;
const PIXEL_SIZE = CANVAS_SIZE / GRID_SIZE;

const COLORS = [
  "#1a1a2e", "#16213e", "#0f3460", "#e94560", // Dark blues and red
  "#533483", "#2c2c54", "#474787", "#aaabb8", // Purples and gray
  "#ff6b35", "#f7c873", "#c44536", "#283618", // Oranges and greens
  "#606c38", "#386641", "#6a994e", "#a7c957", // Greens
  "#582f0e", "#7f4f24", "#936639", "#a68a64", // Browns
  "#ffffff", "#e5e5e5", "#cccccc", "#000000", // Grayscale
];

export default function MemeForge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixels, setPixels] = useState<string[][]>(() => 
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill("transparent"))
  );
  const [currentColor, setCurrentColor] = useState(COLORS[3]);
  const [tool, setTool] = useState<"brush" | "eraser" | "fill">("brush");
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    drawCanvas();
  }, [pixels]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw pixels
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (pixels[y][x] !== "transparent") {
          ctx.fillStyle = pixels[y][x];
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    }

    // Draw grid
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * PIXEL_SIZE, 0);
      ctx.lineTo(i * PIXEL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * PIXEL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * PIXEL_SIZE);
      ctx.stroke();
    }
  };

  const getPixelCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / GRID_SIZE));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / GRID_SIZE));
    
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      return { x, y };
    }
    return null;
  };

  const setPixel = (x: number, y: number) => {
    setPixels(prev => {
      const newPixels = prev.map(row => [...row]);
      if (tool === "eraser") {
        newPixels[y][x] = "transparent";
      } else if (tool === "fill") {
        floodFill(newPixels, x, y, newPixels[y][x], currentColor);
      } else {
        newPixels[y][x] = currentColor;
      }
      return newPixels;
    });
  };

  const floodFill = (grid: string[][], x: number, y: number, targetColor: string, fillColor: string) => {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
    if (grid[y][x] !== targetColor || grid[y][x] === fillColor) return;
    
    grid[y][x] = fillColor;
    floodFill(grid, x + 1, y, targetColor, fillColor);
    floodFill(grid, x - 1, y, targetColor, fillColor);
    floodFill(grid, x, y + 1, targetColor, fillColor);
    floodFill(grid, x, y - 1, targetColor, fillColor);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const coords = getPixelCoords(e);
    if (coords) setPixel(coords.x, coords.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getPixelCoords(e);
    if (coords) setPixel(coords.x, coords.y);
  };

  const handleMouseUp = () => setIsDrawing(false);
  const handleMouseLeave = () => setIsDrawing(false);

  const clearCanvas = () => {
    setPixels(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill("transparent")));
    toast.success("Canvas cleared!");
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a clean version without grid
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = CANVAS_SIZE;
    exportCanvas.height = CANVAS_SIZE;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (pixels[y][x] !== "transparent") {
          ctx.fillStyle = pixels[y][x];
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    }

    const link = document.createElement("a");
    link.download = "rotten-meme.png";
    link.href = exportCanvas.toDataURL();
    link.click();
    toast.success("Meme downloaded!");
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Palette className="w-8 h-8 text-secondary" />
            <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
              MEME FORGE
            </h1>
          </div>
          <p className="font-pixel text-[9px] text-muted-foreground">
            Create pixel art memes • Download or mint as NFT
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="stat-card p-4 rounded-sm"
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="cursor-crosshair"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, imageRendering: "pixelated" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            />
          </motion.div>

          {/* Tools */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card p-6 rounded-sm w-full lg:w-auto"
          >
            {/* Tool Selection */}
            <div className="mb-6">
              <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">TOOLS</h3>
              <div className="flex gap-2">
                {[
                  { id: "brush", icon: Paintbrush, label: "Brush" },
                  { id: "eraser", icon: Eraser, label: "Eraser" },
                  { id: "fill", icon: Square, label: "Fill" },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setTool(id as typeof tool)}
                    className={`p-3 rounded transition-colors ${
                      tool === id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    title={label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div className="mb-6">
              <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">COLORS</h3>
              <div className="grid grid-cols-6 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-8 h-8 rounded transition-transform ${
                      currentColor === color ? "ring-2 ring-foreground scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Current Color */}
            <div className="mb-6">
              <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">CURRENT</h3>
              <div 
                className="w-full h-10 rounded border-2 border-border"
                style={{ backgroundColor: currentColor }}
              />
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={downloadImage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/80 text-accent-foreground font-pixel text-[9px] rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                DOWNLOAD
              </button>
              <button
                onClick={clearCanvas}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/20 hover:bg-primary/40 text-primary font-pixel text-[9px] rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                CLEAR
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}
