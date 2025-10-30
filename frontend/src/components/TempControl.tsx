import React from "react";

interface TempControlProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export default function TempControl({
  value,
  onChange,
  min = 5,
  max = 35,
  step = 0.5,
  disabled = false
}: TempControlProps) {
  
  const handleDecrease = () => {
    const newValue = Math.max(min, Number((value - step).toFixed(1)));
    onChange(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, Number((value + step).toFixed(1)));
    onChange(newValue);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= min && val <= max) {
      onChange(Number(val.toFixed(1)));
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: 20,
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      borderRadius: 12,
      boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
    }}>
      {/* Główny wyświetlacz temperatury */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        gap: 12 
      }}>
        <button 
          onClick={handleDecrease}
          disabled={disabled || value <= min}
          style={{
            fontSize: 28,
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: "2px solid white",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: disabled || value <= min ? "not-allowed" : "pointer",
            transition: "all 0.3s",
            opacity: disabled || value <= min ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!disabled && value > min) {
              e.currentTarget.style.background = "rgba(255,255,255,0.3)";
              e.currentTarget.style.transform = "scale(1.1)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          -
        </button>

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4
        }}>
          <input
            type="number"
            value={value.toFixed(1)}
            onChange={handleInputChange}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            style={{
              fontSize: 48,
              fontWeight: "bold",
              width: 140,
              textAlign: "center",
              background: "transparent",
              border: "none",
              color: "white",
              outline: "none"
            }}
          />
          <div style={{ 
            fontSize: 14, 
            color: "rgba(255,255,255,0.8)",
            fontWeight: 500
          }}>
            Temperatura docelowa
          </div>
        </div>

        <button 
          onClick={handleIncrease}
          disabled={disabled || value >= max}
          style={{
            fontSize: 28,
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: "2px solid white",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: disabled || value >= max ? "not-allowed" : "pointer",
            transition: "all 0.3s",
            opacity: disabled || value >= max ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!disabled && value < max) {
              e.currentTarget.style.background = "rgba(255,255,255,0.3)";
              e.currentTarget.style.transform = "scale(1.1)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          +
        </button>
      </div>

      {/* Slider do precyzyjnej regulacji */}
      <div style={{ width: "100%", paddingInline: 8 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          disabled={disabled}
          style={{
            width: "100%",
            cursor: disabled ? "not-allowed" : "pointer",
            accentColor: "#ffffff"
          }}
        />
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "rgba(255,255,255,0.7)",
          marginTop: 4
        }}>
          <span>{min}°C</span>
          <span>{max}°C</span>
        </div>
      </div>

      {/* Szybkie predefiniowane wartości */}
      <div style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        flexWrap: "wrap"
      }}>
        {[18, 20, 22, 24].map(temp => (
          <button
            key={temp}
            onClick={() => onChange(temp)}
            disabled={disabled}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: value === temp ? "2px solid white" : "1px solid rgba(255,255,255,0.5)",
              background: value === temp ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: 12,
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
          >
            {temp}°C
          </button>
        ))}
      </div>
    </div>
  );
}