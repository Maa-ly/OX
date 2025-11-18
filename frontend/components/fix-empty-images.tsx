'use client';

import { useEffect } from 'react';

/**
 * Workaround for @suiet/wallet-kit ConnectModal rendering images with empty src
 * This component fixes empty src attributes to prevent browser warnings
 */
export function FixEmptyImages() {
  useEffect(() => {
    // Fix empty src attributes on mount and when DOM changes
    const fixEmptyImages = () => {
      const images = document.querySelectorAll('img[src=""]');
      images.forEach((img) => {
        const imgElement = img as HTMLImageElement;
        // Set src to null or a data URI to prevent the warning
        imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
        // Or hide the image if it's not needed
        if (imgElement.alt === '' || !imgElement.alt) {
          imgElement.style.display = 'none';
        }
      });
    };

    // Fix on mount
    fixEmptyImages();

    // Use MutationObserver to fix images added dynamically (like from wallet-kit modal)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          fixEmptyImages();
        }
      });
    });

    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}

