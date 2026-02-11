from playwright.sync_api import sync_playwright
import statistics
import time

def measure_benchmark():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to benchmark page...")
        page.goto("http://localhost:3000/benchmark")

        # Wait for messages to load
        page.wait_for_selector("div[id^='msg-']")

        print("Starting typing simulation...")
        input_selector = "input[placeholder='Type here to trigger re-renders...']"
        page.click(input_selector)

        # Type 20 characters slowly to trigger separate render cycles
        for i in range(20):
            page.type(input_selector, "a")
            # Wait a bit to ensure separate render cycles
            time.sleep(0.1)

        # Get render times
        render_times = page.evaluate("window.renderTimes")

        if not render_times:
            print("No render times recorded.")
        else:
            avg_time = statistics.mean(render_times)
            max_time = max(render_times)
            min_time = min(render_times)
            print(f"Recorded {len(render_times)} renders.")
            print(f"Average render time: {avg_time:.2f}ms")
            print(f"Max render time: {max_time:.2f}ms")
            print(f"Min render time: {min_time:.2f}ms")

        browser.close()

if __name__ == "__main__":
    measure_benchmark()
