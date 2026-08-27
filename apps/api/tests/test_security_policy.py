from openforge_api.security_policy import SECURITY_POLICIES, security_policy_for


def test_sensitive_settings_surfaces_are_marked_fund_manager_only() -> None:
    expected = {
        "profile_settings",
        "profile_import_export",
        "fund_manager_catalogue",
        "fund_manager_quick_actions",
        "profile_quick_actions",
        "notifications",
    }
    assert expected <= SECURITY_POLICIES.keys()
    assert all(security_policy_for(area).security_tag == "fund_manager_only" for area in expected)
