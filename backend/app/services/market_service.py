import os
import requests


def fetch_market_data(state=None, commodity=None):
    """
    Fetch live market prices from the Government of India API.
    Returns current-day APMC mandi prices for the given state/commodity.
    """
    base_url = os.getenv("AGRI_API_URL")

    if not base_url:
        return {"error": "API URL not configured", "markets": []}

    try:
        # Build URL with filters
        fetch_url = base_url
        separator = "&" if "?" in fetch_url else "?"

        if state:
            fetch_url += f"{separator}filters[state.keyword]={state}"
            separator = "&"
        if commodity:
            fetch_url += f"{separator}filters[commodity]={commodity}"
            separator = "&"

        fetch_url += f"{separator}limit=100"

        response = requests.get(fetch_url, timeout=25)
        response.raise_for_status()
        data = response.json()

        records = data.get("records", [])

        if not records:
            return {
                "message": "No data available for the selected filters",
                "markets": [],
                "summary": None,
            }

        # Process records into market comparisons
        markets = {}
        for item in records:
            market_name = item.get("market", "Unknown").strip()
            if market_name not in markets:
                markets[market_name] = {
                    "market": market_name,
                    "state": item.get("state", ""),
                    "district": item.get("district", ""),
                    "commodity": item.get("commodity", ""),
                    "variety": item.get("variety", ""),
                    "grade": item.get("grade", ""),
                    "min_price": [],
                    "max_price": [],
                    "modal_price": [],
                    "arrival_date": item.get("arrival_date", ""),
                }
            try:
                min_p = float(item.get("min_price", 0) or 0)
                max_p = float(item.get("max_price", 0) or 0)
                modal_p = float(item.get("modal_price", 0) or 0)
                if modal_p > 0:
                    markets[market_name]["min_price"].append(min_p)
                    markets[market_name]["max_price"].append(max_p)
                    markets[market_name]["modal_price"].append(modal_p)
            except (ValueError, TypeError):
                continue

        # Aggregate per market
        market_list = []
        all_min, all_max, all_modal = [], [], []

        for m in markets.values():
            if not m["modal_price"]:
                continue

            avg_min = round(sum(m["min_price"]) / len(m["min_price"]), 2) if m["min_price"] else 0
            avg_max = round(sum(m["max_price"]) / len(m["max_price"]), 2) if m["max_price"] else 0
            avg_modal = round(sum(m["modal_price"]) / len(m["modal_price"]), 2)

            all_min.append(avg_min)
            all_max.append(avg_max)
            all_modal.append(avg_modal)

            market_list.append({
                "market": m["market"],
                "state": m["state"],
                "district": m["district"],
                "commodity": m["commodity"],
                "variety": m["variety"],
                "grade": m["grade"],
                "min_price": avg_min,
                "max_price": avg_max,
                "modal_price": avg_modal,
                "arrival_date": m["arrival_date"],
                "records": len(m["modal_price"]),
            })

        # Sort by modal price descending
        market_list.sort(key=lambda x: x["modal_price"], reverse=True)

        # Overall summary
        summary = None
        if all_modal:
            summary = {
                "latest_price": market_list[0]["modal_price"] if market_list else 0,
                "avg_price": round(sum(all_modal) / len(all_modal), 2),
                "min_range": round(min(all_min), 2) if all_min else 0,
                "max_range": round(max(all_max), 2) if all_max else 0,
                "total_markets": len(market_list),
            }

        return {
            "markets": market_list[:20],  # Top 20 markets
            "summary": summary,
            "commodity": commodity,
            "state": state,
        }

    except requests.exceptions.Timeout:
        return {"error": "Government API timed out. Please try again.", "markets": []}
    except requests.exceptions.RequestException as e:
        return {"error": f"Failed to fetch market data: {str(e)}", "markets": []}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}", "markets": []}
