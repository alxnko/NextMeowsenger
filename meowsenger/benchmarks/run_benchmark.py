from playwright.sync_api import sync_playwright
import json
import os

def run_benchmark():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Get absolute path to the HTML file
        benchmark_path = os.path.abspath("meowsenger/benchmarks/base64_perf.html")
        page.goto(f"file://{benchmark_path}")

        # Wait for the results to appear on the page
        # The script writes JSON to body
        page.wait_for_selector("body")

        # Wait until the body text contains "syncTime" (which means JSON is written)
        # We can poll or just wait for a function
        try:
            page.wait_for_function("() => document.body.innerText.includes('syncTime')", timeout=60000)
            result_text = page.inner_text("body")
            print(result_text)
        except Exception as e:
            print(f"Error running benchmark: {e}")

        browser.close()

if __name__ == "__main__":
    run_benchmark()
