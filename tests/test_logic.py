import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_engine.decision_engine.risk_engine import RiskEngine

def test_risk_safe_zone():
    engine = RiskEngine()
    risk, alert, _ = engine.evaluate_risk("APPROACHING", False, 0.0)
    assert risk == "LOW"
    assert not alert

def test_risk_danger_under_threshold():
    engine = RiskEngine()
    risk, alert, _ = engine.evaluate_risk("APPROACHING", True, 2.0)
    assert risk == "MEDIUM"
    assert not alert

def test_risk_critical():
    engine = RiskEngine()
    risk, alert, _ = engine.evaluate_risk("APPROACHING", True, 3.5)
    assert risk == "CRITICAL"
    assert alert

def test_risk_high():
    engine = RiskEngine()
    risk, alert, _ = engine.evaluate_risk("STOPPED", True, 4.0)
    assert risk == "HIGH"
    assert not alert

if __name__ == "__main__":
    test_risk_safe_zone()
    test_risk_danger_under_threshold()
    test_risk_critical()
    test_risk_high()
    print("All logic tests passed!")
