<div class="card table-card">
    <div class="card-heading"><h3>Decoded parameters</h3></div>
    <p id="{{ $prefix }}-parameters-empty" class="parameters-empty" hidden>No readable query parameters were found. See the validation results below.</p>
    <div id="{{ $prefix }}-parameters-table" class="table-scroll" tabindex="0" aria-label="Decoded parameter table">
        <table class="parameter-table">
            <thead><tr><th scope="col">Link / route</th><th scope="col">Parameter</th><th scope="col">Decoded value</th><th scope="col">Role & verification</th></tr></thead>
            <tbody id="{{ $prefix }}-parameters"></tbody>
        </table>
    </div>
</div>
<div class="section-heading"><h3>Validation results</h3></div>
<p id="{{ $prefix }}-lint-summary" class="lint-summary" role="status"></p>
<div id="{{ $prefix }}-lint-results" class="lint-results"></div>
