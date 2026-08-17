from flask import Blueprint, request, jsonify

budget_bp = Blueprint('budget', __name__)

@budget_bp.route('/api/budget', methods=['POST'])
def generate_budget_table():
    data = request.json
    line_items = data.get('line_items', [])

    # Initialize totals
    subtotal = 0
    gst_total = 0

    # Process each line item
    computed_items = []
    for item in line_items:
        qty = item['qty']
        unit_cost = item['unit_cost']
        gst_applicable = item.get('gst_applicable', False)

        amount = qty * unit_cost
        subtotal += amount

        if gst_applicable:
            gst = amount * 0.18  # 18% GST
            gst_total += gst
        else:
            gst = 0

        computed_items.append({
            'item': item['item'],
            'qty': qty,
            'unit_cost': unit_cost,
            'amount': amount,
            'gst': gst
        })

    grand_total = subtotal + gst_total

    # Prepare response
    response = {
        'computed_items': computed_items,
        'subtotal': subtotal,
        'gst_total': gst_total,
        'grand_total': grand_total
    }

    return jsonify(response)
