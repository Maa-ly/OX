"use client";

import { useEffect, useRef, useState } from "react";
import { ODXDatafeed } from "@/lib/datafeeds/odx-datafeed";

interface TradingViewChartProps {
  symbol: string;
  ipTokenId?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Declare TradingView widget type
declare global {
  interface Window {
    TradingView: any;
  }
}

export function TradingViewChart({
  symbol,
  ipTokenId,
  isFullscreen = false,
  onToggleFullscreen,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const datafeedRef = useRef<ODXDatafeed | null>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load TradingView Charting Library
  useEffect(() => {
    if (typeof window === 'undefined' || window.TradingView) {
      setIsLibraryLoaded(true);
      return;
    }

    // Load TradingView library from CDN
    // Note: For production, you should download and host the library files
    // The free version is available at: https://www.tradingview.com/charting-library/
    const script = document.createElement('script');
    script.src = 'https://charting-library.tradingview-widget.com/charting_library/charting_library.standalone.js';
    script.async = true;
    script.onload = () => {
      setIsLibraryLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load TradingView library. Please ensure you have the library files.');
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize TradingView widget
  useEffect(() => {
    if (!isLibraryLoaded || !containerRef.current || !ipTokenId || !window.TradingView) {
      return;
    }

    // Clean up previous widget
    if (widgetRef.current) {
      widgetRef.current.remove();
      widgetRef.current = null;
    }

    if (datafeedRef.current) {
      datafeedRef.current.destroy();
      datafeedRef.current = null;
    }

    try {
      // Create datafeed
      const datafeed = new ODXDatafeed(ipTokenId, symbol);
      datafeedRef.current = datafeed;

      // Create TradingView widget
      const widget = new window.TradingView.widget({
        container: containerRef.current,
        locale: 'en',
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'create_volume_indicator_by_default',
          'header_compare',
          'header_symbol_search',
          'header_screenshot',
          'header_widget',
          'header_saveload',
          'header_chart_type',
          'header_resolutions',
          'header_undo_redo',
          'header_interval_dialog_button',
          'show_interval_dialog_on_key_press',
          'header_chart_type',
          'header_settings',
          'header_fullscreen_button',
          'header_indicators',
          'header_screenshot',
          'header_widget_dom_node',
        ],
        enabled_features: [
          'study_templates',
          'side_toolbar_in_fullscreen_mode',
        ],
        charts_storage_url: '',
        charts_storage_api_version: '1.1',
        client_id: 'odx',
        user_id: 'public_user_id',
        fullscreen: isFullscreen,
        autosize: true,
        symbol: `${symbol}/SUI`,
        interval: '1',
        datafeed: datafeed,
        library_path: '/charting_library/',
        theme: 'dark',
        custom_css_url: '/tradingview-custom.css',
        overrides: {
          'paneProperties.background': '#0f0f14',
          'paneProperties.backgroundType': 'solid',
          'mainSeriesProperties.candleStyle.upColor': '#10b981',
          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
          'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
          'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
        },
        studies_overrides: {},
        loading_screen: {
          backgroundColor: '#0f0f14',
          foregroundColor: '#ffffff',
        },
      });

      widgetRef.current = widget;

      // Handle fullscreen toggle
      if (onToggleFullscreen) {
        widget.onChartReady(() => {
          // You can add custom fullscreen handling here if needed
        });
      }
    } catch (err) {
      console.error('Error initializing TradingView widget:', err);
      setError('Failed to initialize TradingView chart');
    }

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.error('Error removing widget:', e);
        }
        widgetRef.current = null;
      }
      if (datafeedRef.current) {
        datafeedRef.current.destroy();
        datafeedRef.current = null;
      }
    };
  }, [isLibraryLoaded, ipTokenId, symbol, isFullscreen, onToggleFullscreen]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0f0f14] text-red-400">
        <div className="text-center">
          <p className="mb-2">{error}</p>
          <p className="text-sm text-zinc-500">
            To use TradingView charts, you need to download the Charting Library from{' '}
            <a
              href="https://www.tradingview.com/charting-library/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              TradingView
            </a>
            {' '}and place it in the public folder.
          </p>
        </div>
      </div>
    );
  }

  if (!isLibraryLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0f0f14]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent mb-4"></div>
          <p className="text-zinc-400">Loading TradingView library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f14]">
      {/* Chart Container */}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}

